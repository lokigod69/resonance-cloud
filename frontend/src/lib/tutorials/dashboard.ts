import type { DriveStep } from 'driver.js'
import type { TFunction, TutorialDefinition } from './types'

const generateNavSelector = '[data-tutorial-id="dashboard.go_to_generate"]'

function visibleGenerateNav(): Element {
  const targets = Array.from(document.querySelectorAll(generateNavSelector))
  return (
    targets.find((target) => {
      if (!(target instanceof HTMLElement)) return false
      return target.offsetWidth > 0 || target.offsetHeight > 0 || target.getClientRects().length > 0
    }) ??
    targets[0] ??
    document.body
  )
}

export function createDashboardPointerTutorial(t: TFunction): TutorialDefinition {
  const completionTitleKey = 'tutorial.welcome.title'
  const completionBodyKey = 'tutorial.welcome.subtitle'
  const completionDismissKey = 'tutorial.welcome.skip'

  const navStep: DriveStep = {
    element: visibleGenerateNav,
    popover: {
      description: t('tutorial.dashboard.gotoGenerate.caption'),
      side: 'bottom',
      align: 'center',
      showButtons: ['close'],
    },
  }

  return {
    id: 'dashboard-pointer',
    versionedKey: 'generate.v1',
    completionTitleKey,
    completionBodyKey,
    completionDismissKey,
    steps: [
      {
        popover: {
          title: t('tutorial.welcome.title'),
          description: t('tutorial.welcome.subtitle'),
          nextBtnText: t('tutorial.welcome.start'),
          showButtons: ['next', 'close'],
        },
      },
      navStep,
    ],
  }
}
