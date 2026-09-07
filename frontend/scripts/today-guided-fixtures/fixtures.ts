/* eslint-disable */
import { getGuidedPathLessons, resolveGuidedLessonVariant, resolveGuidedBaseContent, type GuidedLesson } from '@/data/guidedLessons'
import type { TodayFixtureScenario } from './stubs/scenario'
import { Ctx, bodyText, byText, pressKey, q, qa, shot, sleep, textOf, typeInto, waitFor, waitGone } from './utils'

type Fixture = {
  id: string
  name: string
  viewport: { width: number; height: number }
  reduceMotion?: boolean
  blockBrandAssets?: boolean
  scenario: TodayFixtureScenario
  localStorageSeed?: Record<string, string>
  run: (ctx: Ctx) => Promise<void>
}

const ROUTE = '/today?path=english-a1-practical-1&vibe=bright'
const MOBILE = { width: 390, height: 844 }
const SE = { width: 320, height: 568 }
const DESKTOP = { width: 1440, height: 1000 }

async function waitForOverview() {
  return waitFor('real Today path overview', () => {
    const shell = q<HTMLElement>('.today-journey-overview')
    return shell && qa('.today-journey-lesson').length >= 10 ? shell : null
  }, 15000)
}

function visibleLessonCards() {
  return qa<HTMLButtonElement>('.today-journey-lesson').filter((card) => card.getBoundingClientRect().width > 0)
}

function footerButton() {
  const button = q<HTMLButtonElement>('.today-session-footerButton')
  if (!button) throw new Error('session footer button missing')
  return button
}

async function advance() {
  const button = footerButton()
  await waitFor('enabled session Continue', () => !button.disabled && button, 5000)
  button.click()
  await sleep(120)
}

async function startFirstLesson() {
  await waitForOverview()
  const start = q<HTMLButtonElement>('.today-journey-nextAction')
  if (!start) throw new Error('featured lesson Start missing')
  start.click()
  await waitFor('scene step', () => q<HTMLElement>('[data-session-step="scene"]'), 8000)
}

async function solveMatchPairs() {
  for (const target of qa<HTMLButtonElement>('.today-match-column:first-child .today-match-chip')) {
    if (target.disabled) continue
    for (const base of qa<HTMLButtonElement>('.today-match-column:nth-child(2) .today-match-chip')) {
      if (base.disabled) continue
      target.click()
      await sleep(60)
      base.click()
      await sleep(700)
      if (target.disabled) break
    }
  }
  await waitFor('all pairs matched', () => qa<HTMLButtonElement>('.today-match-chip').every((button) => button.disabled), 6000)
}

async function solveBuild(lessonOverride?: GuidedLesson) {
  const route = new URL((window as any).__scenario.route, location.origin)
  const pathId = route.searchParams.get('path') ?? 'english-a1-practical-1'
  const definition = getGuidedPathLessons(pathId)[0]
  const lesson = lessonOverride ?? resolveGuidedLessonVariant(definition, 'bright')
  const targetParts: string[] = []
  for (const chip of lesson.build.chips) {
    targetParts.push(chip)
    if (targetParts.join(' ') === lesson.build.targetText) break
  }
  for (const part of targetParts) {
    const button = qa<HTMLButtonElement>('.today-build-chipBank button').find((candidate) => !candidate.disabled && textOf(candidate) === part)
    if (!button) throw new Error(`build chip missing: ${part}`)
    button.click()
    await sleep(80)
  }
  await waitFor('build correct', () => q('[data-build-state="correct"]'), 4000)
}

async function reachTypeStep() {
  await startFirstLesson()
  await reachTypeStepFromScene()
}

async function reachTypeStepFromScene() {
  await advance()
  await waitFor('match step', () => q('[data-session-step="matchPairs"]'))
  await solveMatchPairs()
  await advance()
  await waitFor('build step', () => q('[data-session-step="build"]'))
  await solveBuild()
  await advance()
  await waitFor('type step', () => q('[data-session-step="type"]'))
}

async function completeFirstLessonFromType(ctx: Ctx) {
  const input = q<HTMLInputElement>('.today-type-card input')!
  typeInto(input, 'speak')
  q<HTMLButtonElement>('.today-type-checkButton')!.click()
  await waitFor('correct type answer', () => q('[data-type-state="correct"]'))
  await advance()
  await waitFor('speech step', () => q('[data-session-step="speak"]'))
  ctx.check('no-microphone state requires an explicit alternative', footerButton().disabled, `disabled=${footerButton().disabled}`)
  const speechButtons = qa<HTMLButtonElement>('[data-speech-state="unsupported"] button')
  const noMicrophone = speechButtons.at(-1)
  if (!noMicrophone) throw new Error('no-microphone alternative missing')
  noMicrophone.click()
  await advance()
  return waitFor('completion reward', () => q<HTMLElement>('[data-session-step="complete"]'))
}

function checkNoOverflow(ctx: Ctx) {
  ctx.check('no horizontal overflow', document.documentElement.scrollWidth <= window.innerWidth + 1, `${document.documentElement.scrollWidth}/${window.innerWidth}`)
}

function checkPracticeStageWidth(ctx: Ctx) {
  const stage = q<HTMLElement>('.today-session-shell')
  const width = stage?.getBoundingClientRect().width ?? 0
  const expected = Math.min(window.innerWidth - 50, 680)
  ctx.check('practice stage keeps the full reading column', width >= expected, `${width.toFixed(1)} >= ${expected.toFixed(1)}`)
}

function checkVisibleTextFitsViewport(ctx: Ctx, scopeSelector = '.today-session-shell') {
  const candidates = qa<HTMLElement>(`${scopeSelector} :is(h1,h2,h3,p,button,span,label)`)
    .filter((element) => isVisible(element) && textOf(element).length > 0)
  const failures = candidates.flatMap((element) => {
    const rect = textRect(element)
    return rect.width > 0 && (rect.left < -1 || rect.right > window.innerWidth + 1)
      ? [`${element.tagName.toLowerCase()} "${textOf(element).slice(0, 42)}" ${rect.left.toFixed(1)}..${rect.right.toFixed(1)}`]
      : []
  })
  ctx.check('all visible lesson text stays within the viewport', candidates.length > 0 && failures.length === 0, failures.join(' | ') || `${candidates.length} text elements`)
}

function isVisible(element: Element) {
  const style = getComputedStyle(element)
  return element.getClientRects().length > 0 && style.visibility !== 'hidden' && style.display !== 'none'
}

function rgbaAlpha(color: string) {
  const match = /rgba?\([^)]*?(?:[,/]\s*)([\d.]+)\s*\)$/.exec(color)
  return match ? Number(match[1]) : color === 'transparent' ? 0 : 1
}

function hasDecorativeRim(element: Element) {
  const style = getComputedStyle(element)
  const borderVisible = ['Top', 'Right', 'Bottom', 'Left'].some((side) => {
    const width = Number.parseFloat(style.getPropertyValue(`border-${side.toLowerCase()}-width`))
    const borderStyle = style.getPropertyValue(`border-${side.toLowerCase()}-style`)
    const color = style.getPropertyValue(`border-${side.toLowerCase()}-color`)
    return width > 0.5 && borderStyle !== 'none' && rgbaAlpha(color) > 0.02
  })
  return borderVisible || (style.boxShadow !== 'none' && style.boxShadow.trim() !== '')
}

function textRect(element: Element) {
  const range = document.createRange()
  range.selectNodeContents(element)
  const rect = range.getBoundingClientRect()
  range.detach()
  return rect
}

function checkTileGeometry(ctx: Ctx, label: string, elements: Element[]) {
  const visible = elements.filter(isVisible)
  const failures = visible.flatMap((element, index) => {
    const box = element.getBoundingClientRect()
    const content = textRect(element)
    const style = getComputedStyle(element)
    const problems: string[] = []
    if (box.left < -1 || box.right > window.innerWidth + 1) problems.push(`viewport ${box.left.toFixed(1)}..${box.right.toFixed(1)}`)
    if (content.width > 0 && (content.left < box.left - 1 || content.right > box.right + 1 || content.top < box.top - 1 || content.bottom > box.bottom + 1)) {
      problems.push(`text ${content.left.toFixed(1)},${content.top.toFixed(1)}..${content.right.toFixed(1)},${content.bottom.toFixed(1)} outside ${box.left.toFixed(1)},${box.top.toFixed(1)}..${box.right.toFixed(1)},${box.bottom.toFixed(1)}`)
    }
    if (style.textOverflow === 'ellipsis' || style.whiteSpace === 'nowrap') problems.push(`${style.whiteSpace}/${style.textOverflow}`)
    if (Number.parseFloat(style.fontSize) < 16) problems.push(`font ${style.fontSize}`)
    return problems.map((problem) => `#${index} ${textOf(element).slice(0, 48)}: ${problem}`)
  })
  ctx.check(`${label} text stays inside content-sized tiles`, visible.length > 0 && failures.length === 0, failures.join(' | ') || `${visible.length} tiles`)
}

function checkSingleTileRim(ctx: Ctx, label: string, elements: Element[]) {
  const failures = elements.filter(isVisible).flatMap((element, index) => {
    const pseudo = getComputedStyle(element, '::before')
    const pseudoUsesStretchedFrame = pseudo.content !== 'none'
      && pseudo.backgroundImage !== 'none'
      && /100%\s+100%/.test(pseudo.backgroundSize)
    const rings = (getComputedStyle(element).boxShadow.match(/rgb\(/g) ?? []).length
    return pseudoUsesStretchedFrame || rings > 1
      ? [`#${index} ${textOf(element).slice(0, 40)}: background=${pseudo.backgroundImage}; borderImage=${pseudo.borderImageSlice}; shadow=${getComputedStyle(element).boxShadow}`]
      : []
  })
  ctx.check(`${label} use one tile treatment without stretched frame art`, failures.length === 0, failures.join(' | ') || `${elements.filter(isVisible).length} tiles`)
}

async function checkVisibleDecorationsDecoded(ctx: Ctx, scopeSelector: string, requireTileAssets = true) {
  const images = qa<HTMLImageElement>(`${scopeSelector} img`).filter(isVisible)
  await waitFor('visible decorative images to settle', () => images.every((image) => image.complete), 8000)
  const broken = images.filter((image) => image.naturalWidth === 0 || image.naturalHeight === 0)
  ctx.check('all visible decorative images decode', images.length > 0 && broken.length === 0, broken.map((image) => image.src).join(' | ') || `${images.length} images`)

  const tileAssetUrls = Array.from(new Set(qa<HTMLElement>(`${scopeSelector} .today-word-piece`).map((tile) => {
    const source = getComputedStyle(tile, '::before').borderImageSource
    return /^url\(["']?(.*?)["']?\)$/.exec(source)?.[1]
  }).filter((url): url is string => Boolean(url))))
  const failedAssets: string[] = []
  await Promise.all(tileAssetUrls.map((url) => new Promise<void>((resolve) => {
    const probe = new Image()
    probe.onload = () => resolve()
    probe.onerror = () => { failedAssets.push(url); resolve() }
    probe.src = url
  })))
  if (requireTileAssets) {
    ctx.check('every visible tile frame asset loads', tileAssetUrls.length > 0 && failedAssets.length === 0, failedAssets.join(' | ') || `${tileAssetUrls.length} tile assets`)
  }
}

function checkSelectedAnswerIsUnframed(ctx: Ctx) {
  const surface = q<HTMLElement>('.today-build-answerSurface')
  const drop = q<HTMLElement>('.today-build-answerDrop')
  if (!surface || !drop) {
    ctx.check('selected answer is one open unframed zone', false, 'answer surface/drop missing')
    return
  }
  const surfaceRim = hasDecorativeRim(surface)
  const dropRim = hasDecorativeRim(drop)
  ctx.check('selected answer is one open unframed zone', !surfaceRim && !dropRim, `surfaceRim=${surfaceRim}; dropRim=${dropRim}; surface=${getComputedStyle(surface).border}/${getComputedStyle(surface).boxShadow}; drop=${getComputedStyle(drop).border}/${getComputedStyle(drop).boxShadow}`)
}

function checkProgressIsLegibleAndMoves(ctx: Ctx, beforeWidth: number, afterWidth: number) {
  const fill = q<HTMLElement>('.today-session-progressFill')
  const rail = q<HTMLElement>('.today-session-progressRail')
  const style = fill ? getComputedStyle(fill) : null
  const thickness = style ? Number.parseFloat(style.strokeWidth || '0') : 0
  const opacity = style ? Number.parseFloat(style.opacity || '1') : 0
  ctx.check('progress line is visibly substantial', Boolean(rail && fill && thickness >= 2 && opacity >= 0.65), `thickness=${thickness}; opacity=${opacity}`)
  ctx.check('progress line advances after a completed task', afterWidth > beforeWidth + 0.01, `${beforeWidth.toFixed(3)} -> ${afterWidth.toFixed(3)}`)
}

function progressFraction() {
  const dasharray = q<SVGPathElement>('.today-session-progressFill')?.getAttribute('stroke-dasharray') ?? '0'
  return Number.parseFloat(dasharray) || 0
}

function overviewFixture(id: string, viewport: { width: number; height: number }): Fixture {
  return {
    id,
    name: `Today overview baseline at ${viewport.width}px`,
    viewport,
    scenario: { route: ROUTE, baseLanguage: 'German', activeLanguage: 'English', speech: 'unsupported' },
    async run(ctx) {
      const shell = await waitForOverview()
      await sleep(800)
      ctx.check('split corpus supplies ten visible real lessons', visibleLessonCards().length === 10, visibleLessonCards().length)
      ctx.check('recommended lesson and Start are present', Boolean(q('.today-journey-nextAction')), textOf(shell).slice(0, 300))
      const reviewLabels = qa<HTMLElement>('[data-node-kind="review"]').filter((label) => label.getBoundingClientRect().width > 0)
      ctx.check('review rewards use localized visible labels', reviewLabels.length === 2 && reviewLabels.every((label) => textOf(label).includes('Wiederholung')), reviewLabels.map(textOf).join(' | '))
      const lessonTitles = qa<HTMLElement>('.today-journey-lessonCopy strong').filter((title) => title.getBoundingClientRect().width > 0)
      ctx.check('path exposes all ten localized lesson names', lessonTitles.length === 10 && lessonTitles[0] && textOf(lessonTitles[0]).includes('Erster Kontakt'), lessonTitles.map(textOf).join(' | '))
      checkVisibleTextFitsViewport(ctx, '.today-journey-overview')
      checkNoOverflow(ctx)
      await shot('overview')
      if (viewport.width === 390) {
        reviewLabels[0]?.scrollIntoView({ block: 'center' })
        await sleep(120)
        await shot('review-label')
      }
    },
  }
}

const STRESS_PATHS = {
  Japanese: 'japanese-a1-practical-1',
  Korean: 'korean-a1-practical-1',
  Polish: 'polish-a1-practical-1',
  German: 'german-a1-practical-1',
} as const

function targetBuildChipCount(lesson: GuidedLesson) {
  const parts: string[] = []
  for (const chip of lesson.build.chips) {
    parts.push(chip)
    if (parts.join(' ') === lesson.build.targetText) return parts.length
  }
  return lesson.build.chips.length
}

function pickStressLesson(pathId: string) {
  const lessons = getGuidedPathLessons(pathId).map((definition) => resolveGuidedLessonVariant(definition, 'bright'))
  const phoneFriendly = lessons.filter((lesson) => targetBuildChipCount(lesson) <= 3)
  const candidates = phoneFriendly.length > 0 ? phoneFriendly : lessons
  return candidates.reduce((best, lesson) => {
    const widths = lesson.build.chips.map((chip) => Array.from(chip).length)
    const score = Math.max(...widths) * 10 + Math.max(...widths) - Math.min(...widths)
    const bestWidths = best.build.chips.map((chip) => Array.from(chip).length)
    const bestScore = Math.max(...bestWidths) * 10 + Math.max(...bestWidths) - Math.min(...bestWidths)
    return score > bestScore ? lesson : best
  })
}

function guidedStressFixture(
  language: keyof typeof STRESS_PATHS,
  viewport: { width: number; height: number },
): Fixture {
  const pathId = STRESS_PATHS[language]
  return {
    id: `today-layout-${language.toLowerCase()}-${viewport.width}`,
    name: `${language} long/short practice tiles at ${viewport.width}px`,
    viewport,
    scenario: { route: `/today?path=${pathId}&vibe=bright`, baseLanguage: 'German', activeLanguage: language, speech: 'unsupported' },
    async run(ctx) {
      await waitForOverview()
      const lesson = pickStressLesson(pathId)
      const definitions = getGuidedPathLessons(pathId)
      const lessonIndex = definitions.findIndex((definition) => definition.id === lesson.id)
      const cards = visibleLessonCards()
      const card = cards[lessonIndex]
      if (!card) throw new Error(`lesson card ${lessonIndex} missing for ${lesson.id}`)
      card.scrollIntoView({ block: 'center' })
      card.click()
      await waitFor('stress scene step', () => q<HTMLElement>('[data-session-step="scene"]'), 12000)
      checkPracticeStageWidth(ctx)

      const initialProgress = progressFraction()
      await advance()
      await waitFor('stress match step', () => q('[data-session-step="matchPairs"]'))
      const advancedProgress = progressFraction()
      checkProgressIsLegibleAndMoves(ctx, initialProgress, advancedProgress)

      const matchTiles = qa<HTMLButtonElement>('.today-match-chip')
      checkTileGeometry(ctx, `${language} match`, matchTiles)
      checkSingleTileRim(ctx, `${language} match tiles`, matchTiles)
      const targetTiles = qa<HTMLButtonElement>('.today-match-column:first-child .today-match-chip')
      const baseTiles = qa<HTMLButtonElement>('.today-match-column:nth-child(2) .today-match-chip')
      targetTiles[0]?.click()
      await sleep(80)
      baseTiles[0]?.click()
      await waitFor('visible wrong match outcome', () => qa('[data-match-state="wrong"]').length >= 2)
      const retryableMatchTiles = qa<HTMLButtonElement>('.today-match-chip').filter((tile) => !tile.disabled)
      ctx.check('wrong match stays readable and recoverable', qa('[data-match-state="wrong"]').every(isVisible) && footerButton().disabled && retryableMatchTiles.length === matchTiles.length, `wrong=${qa('[data-match-state="wrong"]').length}; continueDisabled=${footerButton().disabled}; enabled=${retryableMatchTiles.length}/${matchTiles.length}`)
      await solveMatchPairs()
      ctx.check('correct match outcome unlocks Continue', !footerButton().disabled && qa('[data-match-state="matched"]').length === matchTiles.length, `matched=${qa('[data-match-state="matched"]').length}/${matchTiles.length}`)

      await advance()
      await waitFor('stress build step', () => q('[data-session-step="build"]'))
      const bankTiles = qa<HTMLButtonElement>('.today-build-chipBank button')
      checkTileGeometry(ctx, `${language} build`, bankTiles)
      checkSingleTileRim(ctx, `${language} build tiles`, bankTiles)
      const renderedWidths = bankTiles.filter(isVisible).map((tile) => ({ text: textOf(tile), width: tile.getBoundingClientRect().width }))
      const minWidth = Math.min(...renderedWidths.map((item) => item.width))
      const maxWidth = Math.max(...renderedWidths.map((item) => item.width))
      ctx.check('short and long chips keep content-sized widths', renderedWidths.length >= 2 && maxWidth > minWidth + 8, renderedWidths.map((item) => `${item.text}=${item.width.toFixed(1)}`).join(' | '))

      await solveBuild(lesson)
      const selectedTiles = qa<HTMLButtonElement>('.today-build-answerDrop button')
      await waitFor('correct build outcome', () => q('[data-build-state="correct"]'))
      checkSelectedAnswerIsUnframed(ctx)
      checkTileGeometry(ctx, `${language} selected answer`, selectedTiles)
      const builtAnswer = selectedTiles.map(textOf).join(' ')
      ctx.check('correct build retains exact target answer', builtAnswer === lesson.build.targetText, `${builtAnswer} <> ${lesson.build.targetText}`)
      if (viewport.width <= 390 && targetBuildChipCount(lesson) <= 3) {
        const dropWidth = q<HTMLElement>('.today-build-answerDrop')!.getBoundingClientRect().width
        const tooNarrow = selectedTiles.filter((tile) => tile.getBoundingClientRect().width < dropWidth * 0.6)
        const rows = new Set(selectedTiles.map((tile) => Math.round(tile.getBoundingClientRect().top)))
        ctx.check('three-or-fewer phone answer chunks form generous stacked tiles', tooNarrow.length === 0 && rows.size === selectedTiles.length, `drop=${dropWidth.toFixed(1)}; ${selectedTiles.map((tile) => `${textOf(tile)}=${tile.getBoundingClientRect().width.toFixed(1)}@${tile.getBoundingClientRect().top.toFixed(1)}`).join(' | ')}`)
      }
      await checkVisibleDecorationsDecoded(ctx, '.today-session-shell')
      checkVisibleTextFitsViewport(ctx)
      checkNoOverflow(ctx)
      await shot('correct-layout')
      footerButton().scrollIntoView({ block: 'end' })
      await sleep(120)
      const footerRect = footerButton().getBoundingClientRect()
      ctx.check('completed answer controls remain reachable by scrolling', footerRect.top >= -1 && footerRect.bottom <= window.innerHeight + 1, `${footerRect.top.toFixed(1)}..${footerRect.bottom.toFixed(1)} / ${window.innerHeight}`)
      await shot('correct-controls')
    },
  }
}

function checkpointLayoutFixture(viewport: { width: number; height: number }): Fixture {
  return {
    id: `today-checkpoint-layout-${viewport.width}`,
    name: `Checkpoint pending, wrong, and summary at ${viewport.width}px`,
    viewport,
    scenario: { route: '/today/checkpoint?mode=path-check&path=english-a1-practical-1&vibe=bright', baseLanguage: 'German', activeLanguage: 'English', speech: 'unsupported' },
    async run(ctx) {
      await waitFor('checkpoint pending type step', () => q<HTMLElement>('.today-checkpoint-page .today-checkpoint-prompt[data-result="pending"]'), 15000)
      const checkpointRoot = q<HTMLElement>('.today-checkpoint-page')!
      const prompt = q<HTMLElement>('.today-checkpoint-prompt')!
      const clozeInput = prompt.querySelector<HTMLInputElement>('.today-checkpoint-input')
      ctx.check('checkpoint asks for the same missing part that it grades', Boolean(clozeInput && prompt.querySelector('[data-empty-before]') && clozeInput.placeholder === 'Fehlenden Teil einsetzen' && textOf(checkpointRoot).includes('Setze den fehlenden Teil ein.')), textOf(prompt))
      const initialCurrent = q<HTMLElement>('.today-checkpoint-progressNode[data-node-state="current"]')!.getBoundingClientRect().left
      const initialAccessibleProgress = Number(q<HTMLElement>('[role="progressbar"]')?.getAttribute('aria-valuenow') ?? 0)
      ctx.check('pending checkpoint is one open prompt area', !hasDecorativeRim(prompt), `${getComputedStyle(prompt).border}/${getComputedStyle(prompt).boxShadow}`)
      const firstAction = q<HTMLButtonElement>('.today-checkpoint-primaryAction')!
      const actionRect = firstAction.getBoundingClientRect()
      ctx.check('checkpoint primary action meets the 56px contract', actionRect.width >= 56 && actionRect.height >= 56, `${actionRect.width.toFixed(1)}x${actionRect.height.toFixed(1)}`)
      checkVisibleTextFitsViewport(ctx, '.today-checkpoint-page')
      checkNoOverflow(ctx)
      await shot('pending')

      let itemCount = 0
      let laterCurrent = initialCurrent
      let laterAccessibleProgress = initialAccessibleProgress
      while (!q('.today-checkpoint-summary') && itemCount < 20) {
        const input = await waitFor('checkpoint answer input', () => q<HTMLInputElement>('.today-checkpoint-input:not(:disabled)'))
        typeInto(input, `wrong answer ${itemCount}`)
        const check = await waitFor('enabled checkpoint Check action', () => qa<HTMLButtonElement>('.today-checkpoint-primaryAction').find((button) => !button.disabled))
        if (!check) throw new Error('enabled checkpoint Check action missing')
        check.click()
        const wrong = await waitFor('checkpoint wrong outcome', () => q<HTMLElement>('.today-checkpoint-prompt[data-result="wrong"]'))
        const feedback = q<HTMLElement>('.today-checkpoint-resultRow .today-answer-feedback')
        ctx.check(`checkpoint item ${itemCount + 1} shows a readable wrong outcome`, Boolean(feedback && textOf(feedback).length > 0 && isVisible(wrong)), textOf(feedback))
        if (itemCount === 0) {
          ctx.check('wrong checkpoint action receives focus for keyboard continuation', q('.today-checkpoint-resultRow')?.contains(document.activeElement) ?? false, (document.activeElement as HTMLElement | null)?.outerHTML.slice(0, 180))
          checkVisibleTextFitsViewport(ctx, '.today-checkpoint-page')
          checkNoOverflow(ctx)
          await shot('wrong')
        }

        const next = q<HTMLButtonElement>('.today-checkpoint-resultRow .today-checkpoint-primaryAction')!
        next.click()
        await waitFor('unsupported checkpoint speech choice', () => q('[data-speech-state="unsupported"]'))
        const continueWithoutMicrophone = qa<HTMLButtonElement>('[data-speech-state="unsupported"] button').at(-1)
        if (!continueWithoutMicrophone) throw new Error('checkpoint no-microphone recovery missing')
        continueWithoutMicrophone.click()
        itemCount += 1
        await waitFor('next checkpoint item or summary', () => q('.today-checkpoint-summary') || q('.today-checkpoint-prompt[data-result="pending"]'))
        const current = q<HTMLElement>('.today-checkpoint-progressNode[data-node-state="current"]')
        if (current) laterCurrent = current.getBoundingClientRect().left
        laterAccessibleProgress = Number(q<HTMLElement>('[role="progressbar"]')?.getAttribute('aria-valuenow') ?? laterAccessibleProgress)
      }

      const summary = await waitFor('checkpoint summary', () => q<HTMLElement>('.today-checkpoint-summary'))
      ctx.check('checkpoint progress advances between real reviewed items', itemCount > 1 && laterCurrent > initialCurrent + 2, `${itemCount} items; ${initialCurrent.toFixed(1)} -> ${laterCurrent.toFixed(1)}`)
      ctx.check('screen-reader progress advances with the visible rail', laterAccessibleProgress > initialAccessibleProgress, `${initialAccessibleProgress} -> ${laterAccessibleProgress}`)
      ctx.check('summary reports reviewed outcomes and offers return', textOf(summary).length > 20 && Boolean(summary.querySelector('a[href^="/today"]')), textOf(summary).slice(0, 500))
      ctx.check('checkpoint root remains within the viewport', checkpointRoot.getBoundingClientRect().left >= -1 && checkpointRoot.getBoundingClientRect().right <= window.innerWidth + 1, `${checkpointRoot.getBoundingClientRect().left.toFixed(1)}..${checkpointRoot.getBoundingClientRect().right.toFixed(1)}`)
      checkVisibleTextFitsViewport(ctx, '.today-checkpoint-page')
      checkNoOverflow(ctx)
      await shot('summary')
    },
  }
}

function practiceVisualTourFixture(viewport: { width: number; height: number }): Fixture {
  return {
    id: `today-practice-tour-${viewport.width}`,
    name: `Practice visual states at ${viewport.width}px`,
    viewport,
    scenario: { route: ROUTE, baseLanguage: 'German', activeLanguage: 'English', speech: 'unsupported' },
    async run(ctx) {
      await startFirstLesson()
      checkVisibleTextFitsViewport(ctx)
      await shot('scene')
      await advance()
      await waitFor('tour match step', () => q('[data-session-step="matchPairs"]'))
      checkTileGeometry(ctx, 'tour match', qa('.today-match-chip'))
      await shot('match')
      await solveMatchPairs()
      await advance()
      await waitFor('tour build step', () => q('[data-session-step="build"]'))
      checkTileGeometry(ctx, 'tour build', qa('.today-build-chipBank button'))
      await shot('build')
      await solveBuild()
      checkSelectedAnswerIsUnframed(ctx)
      await checkVisibleDecorationsDecoded(ctx, '.today-session-shell')
      await shot('build-correct')
      await advance()
      await waitFor('tour type step', () => q('[data-session-step="type"]'))
      await shot('type')
      typeInto(q<HTMLInputElement>('.today-type-card input')!, 'speak')
      q<HTMLButtonElement>('.today-type-checkButton')!.click()
      await waitFor('tour correct type state', () => q('[data-type-state="correct"]'))
      await advance()
      await waitFor('tour speech step', () => q('[data-session-step="speak"]'))
      await shot('speech')
      const noMicrophone = qa<HTMLButtonElement>('[data-speech-state="unsupported"] button').at(-1)
      if (!noMicrophone) throw new Error('tour no-microphone action missing')
      noMicrophone.click()
      await advance()
      const completion = await waitFor('tour completion', () => q<HTMLElement>('[data-session-step="complete"]'))
      ctx.check('visual tour reaches completion without automatic advancement', Boolean(completion && byText('button', 'Nächste Lektion')), textOf(completion).slice(0, 400))
      await checkVisibleDecorationsDecoded(ctx, '.today-session-shell', false)
      checkVisibleTextFitsViewport(ctx)
      checkNoOverflow(ctx)
      await shot('completion')
    },
  }
}

function cafeReferenceFixture(viewport: { width: number; height: number }): Fixture {
  return {
    id: `today-cafe-reference-${viewport.width}`,
    name: `Spanish-base café reference at ${viewport.width}px`,
    viewport,
    scenario: { route: ROUTE, baseLanguage: 'Spanish', activeLanguage: 'English', speech: 'unsupported' },
    async run(ctx) {
      await waitForOverview()
      const definition = getGuidedPathLessons('english-a1-practical-1')[2]
      const lesson = resolveGuidedLessonVariant(definition, 'bright')
      visibleLessonCards()[2]?.click()
      await waitFor('café scene', () => q('[data-session-step="scene"]'))
      checkPracticeStageWidth(ctx)
      await advance()
      await waitFor('café match', () => q('[data-session-step="matchPairs"]'))
      await solveMatchPairs()
      await advance()
      await waitFor('café build', () => q('[data-session-step="build"]'))
      await solveBuild(lesson)
      await waitFor('café correct build', () => q('[data-build-state="correct"]'))
      const selected = qa<HTMLButtonElement>('.today-build-answerDrop button')
      const builtAnswer = selected.map(textOf).join(' ')
      const spanishMeaning = resolveGuidedBaseContent(lesson.corePhrase.baseText, { preferredBaseLanguage: 'Spanish', authoredBaseLanguage: lesson.baseLanguage })
      ctx.check('café reference keeps the exact authored target', lesson.build.targetText === "I'd like a coffee, please." && builtAnswer === lesson.build.targetText, `${builtAnswer} <> ${lesson.build.targetText}`)
      ctx.check('published Spanish meaning remains visible beside the English target', !spanishMeaning.isFallback && bodyText().includes(spanishMeaning.text), `${spanishMeaning.text} | ${bodyText().slice(0, 500)}`)
      checkSelectedAnswerIsUnframed(ctx)
      checkTileGeometry(ctx, 'café answer', selected)
      await checkVisibleDecorationsDecoded(ctx, '.today-session-shell')
      checkVisibleTextFitsViewport(ctx)
      checkNoOverflow(ctx)
      await shot('correct-build')
    },
  }
}

function checkNativeInputMetadata(ctx: Ctx, input: HTMLInputElement, language: string) {
  ctx.check('native input exposes mobile keyboard metadata', input.lang === language
    && input.dir === 'auto'
    && input.autocomplete === 'off'
    && input.getAttribute('autocapitalize') === 'none'
    && input.getAttribute('autocorrect') === 'off'
    && input.spellcheck === false
    && input.getAttribute('enterkeyhint') === 'done', `${input.outerHTML.slice(0, 500)}`)
}

const japaneseImeRoute = '/today?path=japanese-a1-practical-1&vibe=bright&start=1'

const japaneseTodayImeFixture: Fixture = {
  id: 'today-native-ime-japanese-390',
  name: 'Japanese IME composition does not grade Today recall early',
  viewport: MOBILE,
  scenario: { route: japaneseImeRoute, baseLanguage: 'German', activeLanguage: 'Japanese', speech: 'unsupported' },
  async run(ctx) {
    await waitFor('Japanese scene', () => q('[data-session-step="scene"]'), 15000)
    const lesson = resolveGuidedLessonVariant(getGuidedPathLessons('japanese-a1-practical-1')[0], 'bright')
    await advance(); await waitFor('Japanese match', () => q('[data-session-step="matchPairs"]'))
    await solveMatchPairs(); await advance(); await waitFor('Japanese build', () => q('[data-session-step="build"]'))
    await solveBuild(lesson); await advance(); await waitFor('Japanese type', () => q('[data-session-step="type"]'))
    const input = q<HTMLInputElement>('.today-type-card input')!
    checkNativeInputMetadata(ctx, input, 'ja')
    ctx.check('Japanese keyboard hint is quiet and Script Lab is initially absent', Boolean(q('[data-guided-native-input-support="ja"]')) && !q('[data-guided-script-lab-link]'), bodyText().slice(-400))
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '違' }))
    typeInto(input, '違う')
    await pressKey('Enter', '.today-type-card input')
    await sleep(120)
    ctx.check('Enter during Japanese composition does not grade', q('.today-type-card')?.getAttribute('data-type-state') === 'idle' && !q('[data-guided-script-lab-link]'), `${q('.today-type-card')?.getAttribute('data-type-state')}; ${bodyText().slice(-300)}`)
    input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '違う' }))
    await pressKey('Enter', '.today-type-card input', 229)
    await sleep(120)
    ctx.check('legacy WebKit keyCode 229 after composition end does not grade', q('.today-type-card')?.getAttribute('data-type-state') === 'idle', q('.today-type-card')?.getAttribute('data-type-state'))
    await pressKey('Enter', '.today-type-card input')
    await waitFor('one Japanese wrong grade', () => q('.today-type-card[data-type-state="wrong"]'))
    const link = q<HTMLAnchorElement>('[data-guided-script-lab-link="japanese-hiragana"]')
    ctx.check('composition end permits one normal grade and reveals Hiragana help', qa('.today-brand-feedback[data-feedback="wrong"]').length === 1 && link?.getAttribute('href') === '/alphabet/japanese-hiragana', `${qa('.today-brand-feedback[data-feedback="wrong"]').length}; ${link?.getAttribute('href')}`)
    checkVisibleTextFitsViewport(ctx)
    checkNoOverflow(ctx)
    await shot('wrong-after-composition')
  },
}

const japaneseCheckpointImeFixture: Fixture = {
  id: 'today-checkpoint-native-ime-japanese-390',
  name: 'Japanese IME composition does not submit checkpoint recall early',
  viewport: MOBILE,
  scenario: { route: '/today/checkpoint?mode=path-check&path=japanese-a1-practical-1&vibe=bright', baseLanguage: 'German', activeLanguage: 'Japanese', speech: 'unsupported' },
  async run(ctx) {
    const input = await waitFor('Japanese checkpoint input', () => q<HTMLInputElement>('.today-checkpoint-input:not(:disabled)'), 15000)
    const observedEnters: Array<{ defaultPrevented: boolean; keyCode: number; isComposing: boolean }> = []
    const observeEnter = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && event.target === input) {
        observedEnters.push({ defaultPrevented: event.defaultPrevented, keyCode: event.keyCode, isComposing: event.isComposing })
      }
    }
    document.addEventListener('keydown', observeEnter)
    checkNativeInputMetadata(ctx, input, 'ja')
    ctx.check('checkpoint shows Japanese keyboard hint before grading', Boolean(q('[data-guided-native-input-support="ja"]')) && !q('[data-guided-script-lab-link]'), bodyText().slice(-400))
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '違' }))
    typeInto(input, '違う')
    await pressKey('Enter', '.today-checkpoint-input')
    await sleep(120)
    ctx.check('checkpoint Enter during composition confirms the candidate without preventing or grading', q('.today-checkpoint-prompt')?.getAttribute('data-result') === 'pending' && !q('.today-checkpoint-resultRow') && observedEnters.at(-1)?.defaultPrevented === false, `${q('.today-checkpoint-prompt')?.getAttribute('data-result')}; ${JSON.stringify(observedEnters.at(-1))}`)
    input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '違う' }))
    await pressKey('Enter', '.today-checkpoint-input', 229)
    await sleep(120)
    ctx.check('checkpoint prevents legacy WebKit keyCode 229 without grading', q('.today-checkpoint-prompt')?.getAttribute('data-result') === 'pending' && observedEnters.at(-1)?.defaultPrevented === true && observedEnters.at(-1)?.keyCode === 229, `${q('.today-checkpoint-prompt')?.getAttribute('data-result')}; ${JSON.stringify(observedEnters.at(-1))}`)
    await pressKey('Enter', '.today-checkpoint-input')
    await waitFor('one Japanese checkpoint wrong grade', () => q('.today-checkpoint-prompt[data-result="wrong"]'))
    const link = q<HTMLAnchorElement>('[data-guided-script-lab-link="japanese-hiragana"]')
    ctx.check('checkpoint composition end submits once and reveals Hiragana help', qa('.today-checkpoint-resultRow').length === 1 && link?.getAttribute('href') === '/alphabet/japanese-hiragana', `${qa('.today-checkpoint-resultRow').length}; ${link?.getAttribute('href')}`)
    document.removeEventListener('keydown', observeEnter)
    checkVisibleTextFitsViewport(ctx, '.today-checkpoint-page')
    checkNoOverflow(ctx)
    await shot('wrong-after-composition')
  },
}

const trophyImeFixture: Fixture = {
  id: 'today-trophy-ime-english-390',
  name: 'Trophy cloze does not grade composition blur early',
  viewport: MOBILE,
  scenario: { route: '/today/checkpoint?mode=trophy-cloze&path=english-a1-practical-1&segment=1&vibe=bright', baseLanguage: 'German', activeLanguage: 'English', speech: 'unsupported' },
  async run(ctx) {
    const input = await waitFor('canonical trophy cloze input', () => q<HTMLInputElement>('.today-trophy-clozeInput:not(:disabled)'), 15000)
    const row = input.closest<HTMLElement>('[data-result]')!
    checkNativeInputMetadata(ctx, input, 'en')
    input.focus()
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '違' }))
    typeInto(input, '違う')
    input.blur()
    await sleep(120)
    ctx.check('blur during trophy composition does not grade', row.dataset.result === 'idle' && !q('[data-guided-script-lab-link]'), `${row.dataset.result}; ${textOf(row)}`)
    input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '違う' }))
    await pressKey('Enter', '.today-trophy-clozeInput', 229)
    await sleep(120)
    ctx.check('legacy WebKit keyCode 229 does not grade trophy input', row.dataset.result === 'idle', row.dataset.result)
    input.blur()
    await waitFor('one trophy wrong grade', () => row.dataset.result === 'wrong' && row)
    ctx.check('ordinary post-composition blur grades exactly once', qa('.today-trophy-lyricRow[data-result="wrong"]').length === 1, qa('.today-trophy-lyricRow[data-result="wrong"]').length)
    checkVisibleTextFitsViewport(ctx, '.today-checkpoint-page')
    checkNoOverflow(ctx)
    await shot('wrong-after-composition')
  },
}

export const FIXTURES: Fixture[] = [
  ...Object.keys(STRESS_PATHS).flatMap((language) => [SE, MOBILE, DESKTOP].map((viewport) => (
    guidedStressFixture(language as keyof typeof STRESS_PATHS, viewport)
  ))),
  ...[SE, MOBILE, DESKTOP].map(checkpointLayoutFixture),
  ...[MOBILE, DESKTOP].map(practiceVisualTourFixture),
  ...[MOBILE, DESKTOP].map(cafeReferenceFixture),
  japaneseTodayImeFixture,
  japaneseCheckpointImeFixture,
  trophyImeFixture,
  ...(['English', 'German', 'French', 'Spanish', 'Italian', 'Portuguese', 'Indonesian', 'Polish', 'Russian', 'Korean', 'Japanese', 'Bisaya'] as const).map((baseLanguage, index): Fixture => ({
    id: `today-base-${baseLanguage.toLowerCase()}-${index % 3 === 0 ? 320 : 390}`,
    name: `${baseLanguage} base loads a full explanation edition and real practice`,
    viewport: index % 3 === 0 ? SE : MOBILE,
    scenario: { route: `${ROUTE}&start=1`, baseLanguage, activeLanguage: 'English', speech: 'unsupported' },
    async run(ctx) {
      const session = await waitFor('localized lesson', () => q<HTMLElement>('[data-session-step="scene"]'), 20000)
      const lesson = resolveGuidedLessonVariant(getGuidedPathLessons('english-a1-practical-1')[0], 'bright')
      const meaning = resolveGuidedBaseContent(lesson.corePhrase.baseText, { preferredBaseLanguage: baseLanguage, authoredBaseLanguage: lesson.baseLanguage })
      ctx.check('requested base has a complete published meaning', !meaning.isFallback && meaning.language === baseLanguage && textOf(session).includes(meaning.text), `${meaning.language}: ${meaning.text}`)
      ctx.check('target phrase remains unchanged', textOf(session).includes('Hi there, do you speak English?'), textOf(session).slice(0,500))
      await advance(); await solveMatchPairs(); await advance()
      await waitFor('build step', () => q('[data-session-step="build"]'))
      await solveBuild()
      await waitFor('miniature feedback asset decoded', () => qa<HTMLImageElement>('.today-brand-feedback img').some(img => img.complete && img.naturalWidth > 0), 5000)
      ctx.check('correct phrase unlocks Continue and has visible text plus decorative feedback', !footerButton().disabled && textOf(q('.today-brand-feedback')).length > 0 && Boolean(q('.today-brand-feedback img[aria-hidden="true"]')), textOf(q('.today-brand-feedback')))
      ctx.check('base shell has no untranslated keys', !/today\.[a-z]|common\.loading/i.test(bodyText()), bodyText().slice(-500))
      checkNoOverflow(ctx)
      await shot('localized-correct')
    },
  })),
  overviewFixture('today-overview-320', SE),
  overviewFixture('today-overview-390', MOBILE),
  overviewFixture('today-overview-1440', DESKTOP),
  {
    id: 'today-overview-fr-390',
    name: 'French overview localizes the visible review rewards',
    viewport: MOBILE,
    scenario: { route: ROUTE, baseLanguage: 'French', activeLanguage: 'English', speech: 'unsupported' },
    async run(ctx) {
      await waitForOverview()
      const reviewLabels = qa<HTMLElement>('[data-node-kind="review"]').filter((label) => label.getBoundingClientRect().width > 0)
      ctx.check('French review rewards have visible localized labels', reviewLabels.length === 2 && reviewLabels.every((label) => textOf(label).includes('Révision')), reviewLabels.map(textOf).join(' | '))
      const reviewBadge = reviewLabels[0]
      const labelRect = reviewLabels[0]?.getBoundingClientRect()
      const badgeRect = reviewBadge?.getBoundingClientRect()
      ctx.check('localized review is a usable 44px reward control', Boolean(labelRect && badgeRect && badgeRect.height >= 44 && badgeRect.width >= 44), `${badgeRect?.width}x${badgeRect?.height}`)
      reviewLabels[0]?.scrollIntoView({ block: 'center' })
      await sleep(120)
      checkNoOverflow(ctx)
      await shot('french-review-label')
    },
  },
  {
    id: 'today-lower-lesson-390',
    name: 'Selecting a lower mobile lesson starts it directly',
    viewport: MOBILE,
    scenario: { route: ROUTE, baseLanguage: 'German', activeLanguage: 'English', speech: 'unsupported' },
    async run(ctx) {
      await waitForOverview()
      const cards = visibleLessonCards()
      cards.at(-1)!.scrollIntoView({ block: 'center' })
      cards.at(-1)!.click()
      const session = await waitFor('lesson ten session', () => q<HTMLElement>('.today-session-shell'))
      await shot('lesson-10-started')
      ctx.check('lower lesson tap opens its session directly', textOf(session).includes('Lektion 10'), textOf(session).slice(0, 300))
      ctx.check('new task starts at the top of the viewport', session.getBoundingClientRect().top >= 0, session.getBoundingClientRect().top)
      checkNoOverflow(ctx)
    },
  },
  {
    id: 'today-options-dialog-390',
    name: 'Today Options behaves as a modal dialog',
    viewport: MOBILE,
    scenario: { route: ROUTE, baseLanguage: 'German', activeLanguage: 'English', speech: 'unsupported' },
    async run(ctx) {
      await waitForOverview()
      const opener = q<HTMLButtonElement>('.today-journey-options')!
      opener.focus()
      opener.click()
      const modal = await waitFor('Options dialog', () => q<HTMLElement>('[role="dialog"]'))
      await sleep(100)
      await shot('options')
      ctx.check('focus moves inside opened dialog', modal.contains(document.activeElement), `${(document.activeElement as HTMLElement | null)?.tagName ?? 'none'}`)
      const controls = qa<HTMLElement>('[role="dialog"] button')
      const undersized = controls.filter((control) => {
        const rect = control.getBoundingClientRect()
        return rect.width < 44 || rect.height < 44
      })
      ctx.check('dialog controls meet 44px targets', undersized.length === 0, undersized.map((node) => `${textOf(node) || node.getAttribute('aria-label')}:${node.getBoundingClientRect().width.toFixed(0)}x${node.getBoundingClientRect().height.toFixed(0)}`).join(', '))
      await pressKey('Escape')
      await waitGone('Options dialog', () => q('[role="dialog"]'))
      ctx.check('Escape closes and restores the opener', document.activeElement === opener, `${(document.activeElement as HTMLElement | null)?.className ?? 'none'}`)
    },
  },
  {
    id: 'today-a1-completion-390',
    name: 'A1 lesson reaches the real reward screen without paid services',
    viewport: MOBILE,
    scenario: { route: ROUTE, baseLanguage: 'German', activeLanguage: 'English', speech: 'unsupported' },
    async run(ctx) {
      await reachTypeStep()
      const reward = await completeFirstLessonFromType(ctx)
      await sleep(900)
      ctx.check('reward includes trophy word and next action', textOf(reward).includes('Trophäenwort') && Boolean(byText('button', 'Nächste Lektion')), textOf(reward).slice(0, 500))
      q<HTMLButtonElement>('.today-phrase-keep button')!.click()
      const phraseDeckLink = await waitFor('saved phrase receipt', () => q<HTMLAnchorElement>('.today-phrase-keep a'))
      const keepCalls = (window as any).__keptPhrases as Array<{ lessonId: string; phrase: string }>
      ctx.check('retain-to-deck is explicit and keeps the completed lesson phrase once', keepCalls.length === 1 && keepCalls[0]?.lessonId === 'english-a1-practical-001-first-contact' && keepCalls[0]?.phrase === 'Hi there, do you speak English?', JSON.stringify(keepCalls))
      ctx.check('saved receipt links to the canonical deck route', phraseDeckLink.getAttribute('href') === '/deck/today-fixture-phrase-deck', phraseDeckLink.getAttribute('href'))
      checkNoOverflow(ctx)
      await shot('completion')
    },
  },
  {
    id: 'today-keep-retry-390',
    name: 'Lost keep response retries idempotently and exposes the canonical deck link',
    viewport: MOBILE,
    scenario: { route: ROUTE, baseLanguage: 'German', activeLanguage: 'English', speech: 'unsupported', phraseKeep: 'lost-response-once' },
    async run(ctx) {
      await reachTypeStep()
      const reward = await completeFirstLessonFromType(ctx)
      const keepButton = q<HTMLButtonElement>('.today-phrase-keep button')!
      keepButton.click()
      await waitFor('localized keep error', () => q<HTMLElement>('.today-phrase-keep [role="alert"]'))
      const firstCalls = (window as any).__keptPhrases as unknown[]
      const rows = (window as any).__keptPhraseRows as Map<string, unknown>
      ctx.check('lost response shows a retry without claiming success', firstCalls.length === 1 && rows.size === 1 && !q('.today-phrase-keep a'), `calls=${firstCalls.length}; rows=${rows.size}; ${textOf(reward)}`)
      q<HTMLButtonElement>('.today-phrase-keep button')!.click()
      const phraseDeckLink = await waitFor('successful keep retry', () => q<HTMLAnchorElement>('.today-phrase-keep a'))
      const finalCalls = (window as any).__keptPhrases as unknown[]
      ctx.check('retry reuses the logical phrase instead of creating a duplicate', finalCalls.length === 2 && rows.size === 1, `calls=${finalCalls.length}; rows=${rows.size}`)
      ctx.check('retry receipt links to the canonical deck route', phraseDeckLink.getAttribute('href') === '/deck/today-fixture-phrase-deck', phraseDeckLink.getAttribute('href'))
      checkNoOverflow(ctx)
      await shot('keep-retry-saved')
    },
  },
  {
    id: 'today-french-edition-390',
    name: 'French-base cold start and media failure retain French explanations',
    viewport: MOBILE,
    scenario: { route: `${ROUTE}&start=1`, baseLanguage: 'French', activeLanguage: 'English', speech: 'unsupported' },
    async run(ctx) {
      const session = await waitFor('French-localized cold-start lesson', () => q<HTMLElement>('[data-session-step="scene"]'), 15000)
      await sleep(300)
      const page = bodyText()
      const lesson = resolveGuidedLessonVariant(getGuidedPathLessons('english-a1-practical-1')[0], 'bright')
      const meaning = resolveGuidedBaseContent(lesson.corePhrase.baseText, { preferredBaseLanguage: 'French', authoredBaseLanguage: lesson.baseLanguage })
      const caption = resolveGuidedBaseContent(lesson.lessonMedia.caption, { preferredBaseLanguage: 'French', authoredBaseLanguage: lesson.baseLanguage })
      const situation = q<HTMLElement>('.today-scene-situationStrip')
      ctx.check('French edition replaces the authored explanation fallback', !meaning.isFallback && meaning.locale === 'fr' && !textOf(situation).includes('In a cafe'), `${meaning.text} | ${textOf(situation)}`)
      ctx.check('French shell has no untranslated Today keys', !/today\.[a-z]/i.test(page), page.slice(0, 700))
      ctx.check('real target phrase remains attached to its French meaning', textOf(session).includes('Hi there, do you speak English?') && textOf(session).includes(meaning.text), textOf(session).slice(0, 700))
      const failedVideo = q<HTMLVideoElement>('.today-scene-step video')
      if (!failedVideo) throw new Error('authored lesson video missing')
      failedVideo.dispatchEvent(new Event('error'))
      const mediaAlert = await waitFor('localized media failure fallback', () => q<HTMLElement>('.today-scene-step [role="alert"]'))
      const fallbackFigure = mediaAlert.closest('figure')
      ctx.check('media failure shows localized unavailable copy and French caption', textOf(mediaAlert).includes('Média indisponible') && !caption.isFallback && textOf(fallbackFigure).includes(caption.text), textOf(fallbackFigure))
      ctx.check('media failure does not block the scene Continue action', !footerButton().disabled, `disabled=${footerButton().disabled}`)
      q<HTMLButtonElement>('.today-scene-step figure button')!.click()
      const retriedVideo = await waitFor('re-created lesson media after Retry', () => {
        const video = q<HTMLVideoElement>('.today-scene-step video')
        return video && video !== failedVideo ? video : null
      })
      ctx.check('localized Retry re-creates the authored media element', retriedVideo.src === failedVideo.src, `${failedVideo.src} -> ${retriedVideo.src}`)
      ctx.check('media failure and retry leak no raw translation keys', !/today\.[a-z]/i.test(bodyText()), bodyText().slice(0, 900))
      checkNoOverflow(ctx)
      await shot('french-fallback')
      await reachTypeStepFromScene()
      const input = q<HTMLInputElement>('.today-type-card input')!
      typeInto(input, 'wrong')
      q<HTMLButtonElement>('.today-type-checkButton')!.click()
      await waitFor('French wrong-answer state', () => q('[data-type-state="wrong"]'))
      q<HTMLButtonElement>('.today-type-actions button:last-child')!.click()
      await waitFor('French answer reveal', () => q('[data-type-state="revealed"]'))
      ctx.check('French wrong/reveal path has no untranslated Today keys', !/today\.[a-z]/i.test(bodyText()), bodyText().slice(-700))
      await shot('french-revealed')
    },
  },
  {
    id: 'today-cold-start-completion-390',
    name: 'Cold start deep link keeps the real lesson identity through completion',
    viewport: MOBILE,
    scenario: { route: `${ROUTE}&start=1`, baseLanguage: 'German', activeLanguage: 'English', speech: 'unsupported' },
    async run(ctx) {
      const scene = await waitFor('cold-start scene step', () => q<HTMLElement>('[data-session-step="scene"]'), 15000)
      ctx.check('start=1 opens the first real split-corpus lesson', textOf(scene).includes('Erster Kontakt') && textOf(scene).includes('Hi there, do you speak English?'), textOf(scene).slice(0, 500))
      ctx.check('one-shot start flag is consumed from navigation', !(window as any).__location.includes('start=1'), (window as any).__location)
      await reachTypeStepFromScene()
      const reward = await completeFirstLessonFromType(ctx)
      await sleep(900)
      ctx.check('completion belongs to the lesson opened on cold start', textOf(reward).includes('Erster Kontakt') && textOf(reward).includes('speak') && textOf(reward).includes('Hi there, do you speak English?'), textOf(reward).slice(0, 700))
      checkNoOverflow(ctx)
      await shot('cold-start-completion')
    },
  },
  {
    id: 'today-draft-warning-390',
    name: 'Successful local saving stays quiet; unavailable storage stays visible',
    viewport: MOBILE,
    scenario: { route: ROUTE, baseLanguage: 'German', activeLanguage: 'English', speech: 'unsupported' },
    async run(ctx) {
      await startFirstLesson()
      await sleep(100)
      ctx.check('ordinary saving adds no routine notice', !q('.today-session-saveNotice'), textOf(q('.today-session-footer')))
      const originalSetItem = Storage.prototype.setItem
      Storage.prototype.setItem = () => { throw new DOMException('Fixture storage denied', 'QuotaExceededError') }
      try {
        await advance()
        const notice = await waitFor('storage warning', () => q<HTMLElement>('.today-session-saveNotice'))
        ctx.check('a real draft write failure remains visible', textOf(notice).includes('nicht speichern'), textOf(notice))
        checkNoOverflow(ctx)
        await shot('unavailable-storage')
      } finally {
        Storage.prototype.setItem = originalSetItem
      }
    },
  },
  {
    id: 'today-draft-resume-390',
    name: 'Leaving and reopening a lesson resumes the saved task',
    viewport: MOBILE,
    scenario: { route: ROUTE, baseLanguage: 'German', activeLanguage: 'English', speech: 'unsupported' },
    async run(ctx) {
      await startFirstLesson()
      await advance()
      await waitFor('match step', () => q('[data-session-step="matchPairs"]'))
      q<HTMLButtonElement>('.today-session-backPill')!.click()
      await waitForOverview()
      q<HTMLButtonElement>('.today-journey-nextAction')!.click()
      const resumed = await waitFor('resumed session', () => q<HTMLElement>('.today-session-shell'))
      await sleep(200)
      ctx.check('saved draft resumes the last task', resumed.dataset.sessionStep === 'matchPairs', resumed.dataset.sessionStep)
      const stored = Object.keys(localStorage).map((key) => `${key}:${localStorage.getItem(key)}`).join('|')
      ctx.check('draft storage contains no raw transcript or answer field', !/"transcript"\s*:|"answer"\s*:/i.test(stored), stored.slice(0, 500))
      q<HTMLButtonElement>('.today-session-previous')!.click()
      await waitFor('previous task after Back', () => q('[data-session-step="scene"]'))
      ctx.check('Back revisits the previous task instead of leaving the lesson', Boolean(q('[data-session-step="scene"]')), bodyText().slice(0, 300))
      checkNoOverflow(ctx)
      await shot('resumed')
    },
  },
  {
    id: 'today-wrong-reveal-320',
    name: 'Wrong recall cannot silently skip the learning repair',
    viewport: SE,
    scenario: { route: ROUTE, baseLanguage: 'German', activeLanguage: 'English', speech: 'unsupported' },
    async run(ctx) {
      await reachTypeStep()
      const input = q<HTMLInputElement>('.today-type-card input')!
      typeInto(input, 'wrong')
      byText('button', 'Antwort prüfen')!.click()
      const wrongState = await waitFor('wrong recall state', () => q<HTMLElement>('[data-type-state="wrong"]'))
      const feedback = q<HTMLElement>('#today-type-feedback')!
      ctx.check('wrong answer has visible localized feedback', textOf(feedback).length > 0 && feedback.dataset.feedback === 'wrong', textOf(feedback))
      ctx.check('wrong answer keeps Continue disabled', footerButton().disabled, `disabled=${footerButton().disabled}`)
      feedback.scrollIntoView({ block: 'center' })
      await shot('wrong')
      footerButton().click()
      await sleep(150)
      ctx.check('ordinary Continue does not silently skip a wrong answer', Boolean(wrongState && q('[data-session-step="type"]')), bodyText().slice(0, 400))
      q<HTMLButtonElement>('.today-type-actions button:last-child')!.click()
      const revealed = await waitFor('revealed answer repair', () => q<HTMLElement>('[data-type-state="revealed"]'))
      const revealedInput = q<HTMLInputElement>('.today-type-card input')
      ctx.check('explicit help reveals the answer and enables progress', revealedInput?.value === 'speak' && !footerButton().disabled, `${textOf(revealed)} | ${revealedInput?.value}`)
      checkVisibleTextFitsViewport(ctx)
      await shot('revealed')
      checkNoOverflow(ctx)
    },
  },
  {
    id: 'today-missing-brand-assets-320',
    name: 'Practice remains usable when decorative WebPs cannot load',
    viewport: SE,
    blockBrandAssets: true,
    scenario: { route: ROUTE, baseLanguage: 'German', activeLanguage: 'English', speech: 'unsupported' },
    async run(ctx) {
      await startFirstLesson()
      await advance()
      await waitFor('match step without brand assets', () => q('[data-session-step="matchPairs"]'))
      await solveMatchPairs()
      await advance()
      await waitFor('build step without brand assets', () => q('[data-session-step="build"]'))
      const fallbackTiles = qa<HTMLButtonElement>('.today-build-chipBank button')
      checkTileGeometry(ctx, 'fallback build', fallbackTiles)
      ctx.check('failed tile art keeps a visible CSS fallback surface', fallbackTiles.length > 0 && fallbackTiles.every(hasDecorativeRim), fallbackTiles.map((tile) => `${textOf(tile)}:${getComputedStyle(tile).border}/${getComputedStyle(tile).boxShadow}`).join(' | '))
      await shot('missing-tile-assets')
      await solveBuild()
      await advance()
      await waitFor('type step without brand assets', () => q('[data-session-step="type"]'))
      typeInto(q<HTMLInputElement>('.today-type-card input')!, 'wrong')
      q<HTMLButtonElement>('.today-type-checkButton')!.click()
      await waitFor('wrong recall with unavailable decoration', () => q('[data-type-state="wrong"]'))
      const feedback = q<HTMLElement>('#today-type-feedback')!
      const image = feedback.querySelector('img')!
      await waitFor('blocked brand image', () => image.complete && image.naturalWidth === 0)
      ctx.check('written retry feedback survives missing image', textOf(feedback).length > 10 && footerButton().disabled, textOf(feedback))
      q<HTMLButtonElement>('.today-type-actions button:last-child')!.click()
      await waitFor('answer reveal remains available', () => q('[data-type-state="revealed"]'))
      ctx.check('ordinary text and controls still teach the answer', q<HTMLInputElement>('.today-type-card input')?.value === 'speak' && !footerButton().disabled, q<HTMLInputElement>('.today-type-card input')?.value)
      checkVisibleTextFitsViewport(ctx)
      checkNoOverflow(ctx)
      await shot('missing-assets')
    },
  },
  {
    id: 'today-reduced-motion-390',
    name: 'Reduced motion removes practice pulses, shakes, and transforms',
    viewport: MOBILE,
    reduceMotion: true,
    scenario: { route: ROUTE, baseLanguage: 'German', activeLanguage: 'English', speech: 'unsupported' },
    async run(ctx) {
      await startFirstLesson()
      await sleep(150)
      const stage = q<HTMLElement>('.today-step-stage')!
      const fill = q<HTMLElement>('.today-session-progressFill')!
      ctx.check('task entrance animation is removed', getComputedStyle(stage).animationName === 'none', getComputedStyle(stage).animationName)
      const animatedDecorations = qa<HTMLElement>('.today-session-shell img').filter((decoration) => getComputedStyle(decoration).animationName !== 'none')
      ctx.check('decorative motion is removed', animatedDecorations.length === 0, animatedDecorations.map((decoration) => `${decoration.getAttribute('src')}:${getComputedStyle(decoration).animationName}`).join(' | '))
      ctx.check('progress movement is removed', getComputedStyle(fill).transitionDuration === '0s', getComputedStyle(fill).transitionDuration)
      await advance()
      await waitFor('reduced-motion match step', () => q('[data-session-step="matchPairs"]'))
      const tiles = qa<HTMLButtonElement>('.today-match-chip')
      const animatedTiles = tiles.filter((tile) => {
        const style = getComputedStyle(tile)
        return style.animationName !== 'none' || style.transitionDuration.split(',').some((duration) => Number.parseFloat(duration) > 0)
      })
      ctx.check('interactive tiles remove travel and scaling transitions', animatedTiles.length === 0 && tiles.every((tile) => getComputedStyle(tile).transform === 'none'), animatedTiles.map((tile) => `${textOf(tile)}:${getComputedStyle(tile).transitionDuration}/${getComputedStyle(tile).transform}`).join(' | '))
      checkNoOverflow(ctx)
      await shot('reduced-motion')
    },
  },
  {
    id: 'today-trophy-wrong-390',
    name: 'Trophy wrong answers stay available for retry',
    viewport: MOBILE,
    scenario: { route: '/today/checkpoint?mode=trophy-cloze&path=english-a1-practical-1&segment=1&vibe=bright', baseLanguage: 'German', activeLanguage: 'English' },
    async run(ctx) {
      const drill = await waitFor('canonical trophy cloze drill', () => q<HTMLElement>('.today-trophy-drill'), 15000)
      await shot('trophy')
      const inputs = qa<HTMLInputElement>('.today-trophy-clozeInput')
      ctx.check('canonical reward has cloze inputs', inputs.length > 0, inputs.length)
      const reference = q<HTMLDetailsElement>('.today-trophy-reference')!
      ctx.check('song reference starts closed and contains the actual lyric answer', !reference.open && textOf(reference).toLocaleLowerCase('en').includes('delighted') && qa('.today-trophy-wordCard').length === 0, textOf(reference))
      ctx.check('input accessible label does not reveal the missing answer', !inputs[0].getAttribute('aria-label')?.includes('delighted') && !textOf(inputs[0].closest('label')).includes('delighted'), inputs[0].outerHTML)
      for (const input of inputs) {
        input.focus()
        typeInto(input, 'wrong')
        await sleep(60)
        input.blur()
        await sleep(60)
      }
      await sleep(250)
      ctx.check('every wrong answer is graded but earns no progress', qa('.today-trophy-lyricRow[data-result="wrong"]').length === inputs.length && q('[role="progressbar"]')?.getAttribute('aria-valuenow') === '0', textOf(q('[role="progressbar"]')))
      ctx.check('wrong attempts keep the trophy drill open', Boolean(q('.today-trophy-drill')) && (window as any).__location.startsWith('/today/checkpoint'), `${(window as any).__location}; drill=${Boolean(q('.today-trophy-drill'))}`)
      ctx.check('wrong inputs remain enabled for retry', qa<HTMLInputElement>('.today-trophy-clozeInput').every((input) => !input.disabled), qa<HTMLInputElement>('.today-trophy-clozeInput').map((input) => input.disabled).join(','))
      inputs[0].focus()
      typeInto(inputs[0], 'delighted')
      await sleep(60)
      inputs[0].blur()
      await waitFor('corrected lyric earns one solved blank', () => inputs[0].disabled && q('[role="progressbar"]')?.getAttribute('aria-valuenow') === '1')
      ctx.check('one solved blank still cannot complete the whole exercise', Boolean(drill.querySelector<HTMLButtonElement>('.today-checkpoint-primaryAction')?.disabled), textOf(q('[role="progressbar"]')))
      checkNoOverflow(ctx)
      await shot('corrected-first-lyric')
    },
  },
]
