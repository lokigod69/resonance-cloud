export interface GrokTokenLease {
  value: string
  expiresAtMs: number
  reservationId: string
  reservationExpiresAtMs: number
}

export function createGrokMintRequestId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function parseGrokTokenLease(value: unknown): GrokTokenLease | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const raw = value as Record<string, unknown>
  const expiresAtMs = Number(raw.expires_at) * 1000
  const reservationExpiresAtMs = typeof raw.reservation_expires_at === 'string'
    ? new Date(raw.reservation_expires_at).getTime()
    : Number.NaN
  if (
    typeof raw.value !== 'string'
    || !raw.value
    || typeof raw.reservation_id !== 'string'
    || !raw.reservation_id
    || !Number.isFinite(expiresAtMs)
    || !Number.isFinite(reservationExpiresAtMs)
  ) return null
  return {
    value: raw.value,
    expiresAtMs,
    reservationId: raw.reservation_id,
    reservationExpiresAtMs: Math.min(reservationExpiresAtMs, expiresAtMs),
  }
}

export function activeReservationId(
  reservationId: string | null,
  reservationExpiresAtMs: number | null,
  nowMs = Date.now(),
): string | null {
  return reservationId && reservationExpiresAtMs !== null && reservationExpiresAtMs > nowMs
    ? reservationId
    : null
}

export function remainingReservationMs(reservationExpiresAtMs: number | null, nowMs = Date.now()): number {
  if (reservationExpiresAtMs === null || !Number.isFinite(reservationExpiresAtMs)) return 0
  return Math.max(0, reservationExpiresAtMs - nowMs)
}
