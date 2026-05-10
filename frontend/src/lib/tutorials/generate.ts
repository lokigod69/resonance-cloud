import type { DriveStep } from 'driver.js'
import type { TFunction, TutorialDefinition } from './types'

interface StageShape {
  padding: number
  radius: number
}

function onStepHighlight(selector: string, shape: StageShape): DriveStep['onHighlightStarted'] {
  return (_element, _step, { driver }) => {
    driver.setConfig({
      ...driver.getConfig(),
      stagePadding: shape.padding,
      stageRadius: shape.radius,
    })

    if (!document.querySelector(selector)) {
      driver.moveNext()
    }
  }
}

function step(selector: string, caption: string, shape: StageShape): DriveStep {
  return {
    element: selector,
    onHighlightStarted: onStepHighlight(selector, shape),
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
      step('[data-tutorial-id="generate.lang_picker"]', t('tutorial.generate.step1.caption'), { padding: 12, radius: 62 }),
      step('[data-tutorial-id="generate.product_lane"]', t('tutorial.generate.step2.caption'), { padding: 12, radius: 59 }),
      step('[data-tutorial-id="generate.category_picker"]', t('tutorial.generate.step3.caption'), { padding: 10, radius: 12 }),
      step('[data-tutorial-id="generate.words_input"]', t('tutorial.generate.step4.caption'), { padding: 10, radius: 12 }),
      step('[data-tutorial-id="generate.quick_generate_button"]', t('tutorial.generate.step5.caption'), { padding: 12, radius: 999 }),
      step('[data-tutorial-id="generate.customize_button"]', t('tutorial.generate.step6.caption'), { padding: 12, radius: 999 }),
      {
        onHighlightStarted: (_element, _step, { driver }) => {
          driver.setConfig({
            ...driver.getConfig(),
            stagePadding: 0,
            stageRadius: 20,
          })
        },
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
