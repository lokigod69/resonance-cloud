import type { DriveStep } from 'driver.js'
import type { TFunction, TutorialDefinition } from './types'

function skipIfMissing(selector: string): DriveStep['onHighlightStarted'] {
  return (_element, _step, { driver }) => {
    if (!document.querySelector(selector)) {
      driver.moveNext()
    }
  }
}

function step(selector: string, caption: string): DriveStep {
  return {
    element: selector,
    onHighlightStarted: skipIfMissing(selector),
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
      {
        popover: {
          title: t('tutorial.generate.modal.title'),
          description: t('tutorial.generate.modal.subtitle'),
          nextBtnText: t('tutorial.generate.modal.start'),
          showButtons: ['next', 'close'],
        },
      },
      step('[data-tutorial-id="generate.lang_picker"]', t('tutorial.generate.step1.caption')),
      step('[data-tutorial-id="generate.product_lane"]', t('tutorial.generate.step2.caption')),
      step('[data-tutorial-id="generate.category_picker"]', t('tutorial.generate.step3.caption')),
      step('[data-tutorial-id="generate.words_input"]', t('tutorial.generate.step4.caption')),
      step('[data-tutorial-id="generate.quick_generate_button"]', t('tutorial.generate.step5.caption')),
      step('[data-tutorial-id="generate.customize_button"]', t('tutorial.generate.step6.caption')),
      {
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
