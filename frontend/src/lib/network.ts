type NetworkInformationLike = { saveData?: boolean; effectiveType?: string }

/**
 * True on metered / very slow links (Data Saver, 2G). Used to skip speculative
 * downloads — nav-chunk prefetch, the guided corpus for one home card — that
 * only make sense when bandwidth is not the bottleneck.
 */
export function isConstrainedConnection(): boolean {
  if (typeof navigator === 'undefined') return false
  const connection = (navigator as Navigator & { connection?: NetworkInformationLike }).connection
  if (!connection) return false
  return Boolean(connection.saveData)
    || connection.effectiveType === '2g'
    || connection.effectiveType === 'slow-2g'
}
