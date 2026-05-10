import type { Driver } from 'driver.js'
import type { GenerateTutorialStepId, TFunction, TutorialDefinition, TutorialDriveStep } from './types'
import {
  clearTutorialHighlight,
  findFirstReadyDescendant,
  findFirstReadySelector,
  getActionChoiceTarget,
  getElementRadius,
  isReadyTarget,
  markTutorialHighlight,
} from './dom'

interface StageShape {
  padding: number
  radius: number | ((element: HTMLElement) => number)
}

const selectors = {
  languageWrapper: '[data-tutorial-id="generate.lang_picker"]',
  productWrapper: '[data-tutorial-id="generate.product_lane"]',
  categoryPicker: '[data-tutorial-id="generate.category_picker"]',
  wordsInput: '[data-tutorial-id="generate.words_input"]',
} as const

function fallbackElement(): Element {
  return document.body
}

export function resolveGenerateTutorialTarget(stepId: GenerateTutorialStepId, root: Document = document): Element | null {
  if (stepId === 'language') {
    return findFirstReadyDescendant(
      selectors.languageWrapper,
      ['.gen-orb', 'button', '[role="button"]'],
      root,
    ) ?? findFirstReadySelector([selectors.languageWrapper], root)
  }

  if (stepId === 'product') {
    return findFirstReadyDescendant(
      selectors.productWrapper,
      ['.premium-option-orb', '.premium-option-tile', 'button'],
      root,
    ) ?? findFirstReadySelector([selectors.productWrapper], root)
  }

  if (stepId === 'category') {
    return findFirstReadySelector([selectors.categoryPicker], root)
  }

  if (stepId === 'manual') {
    return findFirstReadySelector([selectors.wordsInput], root)
  }

  if (stepId === 'action-choice') {
    return getActionChoiceTarget(root)
  }

  return null
}

function setStage(driver: Driver, shape: StageShape, element: HTMLElement) {
  const radius = typeof shape.radius === 'function' ? shape.radius(element) : shape.radius
  driver.setConfig({
    ...driver.getConfig(),
    stagePadding: shape.padding,
    stageRadius: radius,
  })
}

function onStepHighlight(stepId: GenerateTutorialStepId, shape: StageShape): TutorialDriveStep['onHighlightStarted'] {
  return (_element, _step, { driver }) => {
    const target = resolveGenerateTutorialTarget(stepId)
    if (!isReadyTarget(target)) {
      driver.moveNext()
      return
    }

    setStage(driver, shape, target)
    markTutorialHighlight(target)
  }
}

function step(
  stepId: GenerateTutorialStepId,
  caption: string,
  shape: StageShape,
): TutorialDriveStep {
  return {
    tutorialStepId: stepId,
    element: () => resolveGenerateTutorialTarget(stepId) ?? fallbackElement(),
    onHighlightStarted: onStepHighlight(stepId, shape),
    onDeselected: () => clearTutorialHighlight(),
    popover: {
      description: caption,
      side: 'bottom',
      align: 'center',
    },
  }
}

export function createGenerateTutorial(t: TFunction): TutorialDefinition {
  const completionTitleKey = 'tutorial.generate.complete.title'
  const completionBodyKey = 'tutorial.generate.complete.body'
  const completionDismissKey = 'tutorial.generate.complete.dismiss'

  return {
    id: 'generate',
    versionedKey: 'generate.v1',
    completionTitleKey,
    completionBodyKey,
    completionDismissKey,
    steps: [
      step('language', t('tutorial.generate.step1.caption'), {
        padding: 14,
        radius: (element) => getElementRadius(element, 62),
      }),
      step('product', t('tutorial.generate.step2.caption'), {
        padding: 14,
        radius: (element) => getElementRadius(element, 70),
      }),
      step('category', t('tutorial.generate.step3.caption'), { padding: 14, radius: 14 }),
      step('manual', t('tutorial.generate.step4.caption'), { padding: 14, radius: 14 }),
      step('action-choice', t('tutorial.generate.step5.caption'), { padding: 16, radius: 28 }),
      {
        tutorialStepId: 'complete',
        onHighlightStarted: (_element, _step, { driver }) => {
          clearTutorialHighlight()
          driver.setConfig({
            ...driver.getConfig(),
            stagePadding: 0,
            stageRadius: 20,
          })
        },
        onDeselected: () => clearTutorialHighlight(),
        popover: {
          title: t(completionTitleKey),
          description: t(completionBodyKey),
          doneBtnText: t(completionDismissKey),
          showButtons: ['next'],
        },
      },
    ],
  }
}
