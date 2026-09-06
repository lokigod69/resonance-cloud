export function trackLearningAction(...args: unknown[]) {
  const current = (window as unknown as { __analytics?: unknown[] }).__analytics ?? []
  current.push(args)
  ;(window as unknown as { __analytics: unknown[] }).__analytics = current
}
