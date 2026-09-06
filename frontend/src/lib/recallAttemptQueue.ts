export const RECALL_QUEUE_ERROR_EVENT = 'lingwave:recall-queue-error'

export type RecallQueueRecord = {
  key: string
  userId: string
  receiptId: string
  wordId: string
  knewIt: boolean
  studyMode: string
  metadata: Record<string, unknown> | null
  occurredAt: string
  blocked?: boolean
}

export type RecallQueueErrorDetail = { retry: () => void }
export type RecallQueueStorage = {
  put(record: RecallQueueRecord): Promise<void>
  list(userId: string): Promise<RecallQueueRecord[]>
  delete(key: string): Promise<void>
}
export type RecallQueueDeliveryResult = 'delivered' | 'discarded' | 'conflict' | { clockSkew: string }
export type RecallQueueDelivery = (record: RecallQueueRecord) => Promise<RecallQueueDeliveryResult>

const DB_NAME = 'lingwave-offline'
const STORE_NAME = 'recall-attempts'
const RECALL_DELIVERY_TIMEOUT_MS = 15_000

function newReceiptId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = [...bytes].map(value => value.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function openQueueDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' })
        store.createIndex('by-user', 'userId')
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Recall queue unavailable'))
  })
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Recall queue operation failed'))
  })
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onabort = () => reject(transaction.error ?? new Error('Recall queue transaction aborted'))
    transaction.onerror = () => reject(transaction.error ?? new Error('Recall queue transaction failed'))
  })
}

export const indexedDbRecallQueueStorage: RecallQueueStorage = {
  async put(record) {
    const db = await openQueueDb()
    try {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      await Promise.all([requestResult(transaction.objectStore(STORE_NAME).put(record)), transactionDone(transaction)])
    }
    finally { db.close() }
  },
  async list(userId) {
    const db = await openQueueDb()
    try {
      const records = await requestResult(db.transaction(STORE_NAME).objectStore(STORE_NAME).index('by-user').getAll(userId))
      return (records as RecallQueueRecord[]).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
    } finally { db.close() }
  },
  async delete(key) {
    const db = await openQueueDb()
    try {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      await Promise.all([requestResult(transaction.objectStore(STORE_NAME).delete(key)), transactionDone(transaction)])
    }
    finally { db.close() }
  },
}

export function createRecallAttemptQueue(
  storage: RecallQueueStorage,
  deliver: RecallQueueDelivery,
  notifyFailure: (retry: () => void) => void,
) {
  let activeUserId: string | null = null
  let draining: Promise<void> | null = null
  const notifiedFailures = new Set<string>()

  const drain = async () => {
    if (draining) return draining
    const userAtStart = activeUserId
    if (!userAtStart) return
    draining = (async () => {
      let records: RecallQueueRecord[]
      try {
        records = await storage.list(userAtStart)
      } catch {
        notifyFailure(() => { if (activeUserId === userAtStart) void drain() })
        return
      }
      for (const record of records) {
        if (activeUserId !== userAtStart) return
        if (record.blocked) continue
        try {
          let deliveredRecord = record
          let result = await deliver(deliveredRecord)
          if (activeUserId !== userAtStart) return
          if (typeof result === 'object') {
            deliveredRecord = { ...record, occurredAt: result.clockSkew }
            await storage.put(deliveredRecord)
            result = await deliver(deliveredRecord)
            if (activeUserId !== userAtStart) return
            if (typeof result === 'object') throw new Error('Server clock correction was rejected')
          }
          if (result === 'conflict') {
            await storage.put({ ...deliveredRecord, blocked: true })
            const retryConflict = () => {
              if (activeUserId !== record.userId) return
              const receiptId = newReceiptId()
              void storage.put({ ...deliveredRecord, receiptId, key: `${record.userId}:${receiptId}`, blocked: false })
                .then(() => storage.delete(record.key))
                .then(drain)
                .catch(() => notifyFailure(retryConflict))
            }
            notifyFailure(retryConflict)
            continue
          }
          notifiedFailures.delete(deliveredRecord.key)
          await storage.delete(deliveredRecord.key)
        } catch {
          if (!notifiedFailures.has(record.key)) {
            notifiedFailures.add(record.key)
            notifyFailure(() => {
              notifiedFailures.delete(record.key)
              void drain()
            })
          }
          break
        }
      }
    })().finally(() => { draining = null })
    return draining
  }

  return {
    setUser(userId: string | null) {
      activeUserId = userId
      if (userId) {
        const pendingDrain = draining
        void Promise.resolve(pendingDrain).then(() => {
          if (activeUserId === userId) return drain()
        })
      }
    },
    async enqueue(input: Omit<RecallQueueRecord, 'key' | 'receiptId' | 'blocked'>) {
      if (!activeUserId || input.userId !== activeUserId) throw new Error('Recall queue user changed')
      const receiptId = newReceiptId()
      const record = { ...input, receiptId, key: `${input.userId}:${receiptId}` }
      const retryPersistence = () => {
        if (activeUserId !== record.userId) return
        void storage.put(record).then(drain).catch(() => notifyFailure(retryPersistence))
      }
      try {
        await storage.put(record)
      } catch (error) {
        notifyFailure(retryPersistence)
        throw error
      }
      if (draining) await draining
      await drain()
    },
    drain,
  }
}

const deliverToSupabase: RecallQueueDelivery = async (record) => {
  const [{ supabase }, { withClientDeadline }] = await Promise.all([
    import('@/lib/supabase'),
    import('@/lib/clientDeadline'),
  ])
  return withClientDeadline(async (signal) => {
    const { data, error } = await supabase.rpc('record_recall_attempt', {
      p_receipt_id: record.receiptId,
      p_word_id: record.wordId,
      p_knew_it: record.knewIt,
      p_study_mode: record.studyMode,
      p_metadata: record.metadata,
      p_occurred_at: record.occurredAt,
    }).abortSignal(signal)
    if (error) {
      if (error.message.includes('recall_receipt_conflict')) return 'conflict'
      throw error
    }
    const payload = data as { status?: string; occurred_at?: string } | null
    if (payload?.status === 'inserted' || payload?.status === 'duplicate') return 'delivered'
    if (payload?.status === 'discarded') return 'discarded'
    if (payload?.status === 'clock_skew' && payload.occurred_at) return { clockSkew: payload.occurred_at }
    throw new Error('Unexpected recall receipt response')
  }, RECALL_DELIVERY_TIMEOUT_MS)
}

function notifyRecallQueueFailure(retry: () => void) {
  window.dispatchEvent(new CustomEvent<RecallQueueErrorDetail>(RECALL_QUEUE_ERROR_EVENT, { detail: { retry } }))
}

export const recallAttemptQueue = createRecallAttemptQueue(indexedDbRecallQueueStorage, deliverToSupabase, notifyRecallQueueFailure)
