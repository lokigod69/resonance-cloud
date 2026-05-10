export const TUTORIAL_HIGHLIGHT_CLASS = 'resonance-tutorial-highlight-ring'

export function isReadyTarget(target: Element | null | undefined): target is HTMLElement {
  if (!target) return false
  if (typeof HTMLElement !== 'undefined' && !(target instanceof HTMLElement)) return false
  const measurable = target as Element & { offsetWidth?: number; offsetHeight?: number }
  return (measurable.offsetWidth ?? 0) > 0
    || (measurable.offsetHeight ?? 0) > 0
    || target.getClientRects().length > 0
}

export function findFirstReadySelector(selectors: string[], root: Pick<Document, 'querySelectorAll'> = document): Element | null {
  for (const selector of selectors) {
    const target = Array.from(root.querySelectorAll(selector)).find(isReadyTarget)
    if (target) return target
  }
  return null
}

export function findFirstReadyDescendant(
  containerSelector: string,
  descendantSelectors: string[],
  root: Pick<Document, 'querySelectorAll'> = document,
): Element | null {
  const containers = Array.from(root.querySelectorAll(containerSelector)).filter(isReadyTarget)
  for (const container of containers) {
    for (const selector of descendantSelectors) {
      const target = Array.from(container.querySelectorAll(selector)).find(isReadyTarget)
      if (target) return target
    }
  }
  return null
}

export function getActionChoiceTarget(root: Pick<Document, 'querySelector'> = document): Element | null {
  const primary = root.querySelector('[data-tutorial-id="generate.quick_generate_button"]')
  const secondary = root.querySelector('[data-tutorial-id="generate.customize_button"]')
  if (!isReadyTarget(primary) || !isReadyTarget(secondary)) return null
  return primary.parentElement ?? primary
}

export function getElementRadius(element: HTMLElement, fallback: number): number {
  const rect = element.getBoundingClientRect()
  if (rect.width === rect.height && rect.width > 0) return Math.round(rect.width / 2)

  const rawRadius = window.getComputedStyle(element).borderRadius.split(' ')[0]
  const parsed = Number.parseFloat(rawRadius)
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback
}

export function clearTutorialHighlight(root: ParentNode = document): void {
  root.querySelectorAll(`.${TUTORIAL_HIGHLIGHT_CLASS}`).forEach((target) => {
    target.classList.remove(TUTORIAL_HIGHLIGHT_CLASS)
  })
}

export function markTutorialHighlight(element: Element | null | undefined): void {
  clearTutorialHighlight()
  if (isReadyTarget(element) && element !== document.body) {
    element.classList.add(TUTORIAL_HIGHLIGHT_CLASS)
  }
}
