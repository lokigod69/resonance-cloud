import assert from 'node:assert/strict'

import {
  findFirstReadyDescendant,
  findFirstReadySelector,
  getActionChoiceTarget,
  getElementRadius,
  isReadyTarget,
} from '../src/lib/tutorials/dom.ts'
import { createGenerateTutorial } from '../src/lib/tutorials/generate.ts'

type Rect = { width: number; height: number; top: number; right: number; bottom: number; left: number }

class FakeElement {
  children: FakeElement[] = []
  parentElement: FakeElement | null = null
  className = ''
  textContent = ''
  style: Record<string, string> = {}

  constructor(
    public selector: string,
    public offsetWidth: number,
    public offsetHeight: number,
    private rects: Rect[] = [],
  ) {}

  append(child: FakeElement) {
    child.parentElement = this
    this.children.push(child)
  }

  getClientRects() {
    return this.rects
  }

  getBoundingClientRect() {
    return this.rects[0] ?? {
      width: this.offsetWidth,
      height: this.offsetHeight,
      top: 0,
      right: this.offsetWidth,
      bottom: this.offsetHeight,
      left: 0,
    }
  }

  querySelectorAll(selector: string) {
    return this.children.filter((child) => child.selector === selector)
  }
}

class FakeDocument {
  constructor(private elements: FakeElement[]) {}

  querySelectorAll(selector: string) {
    return this.elements.filter((element) => element.selector === selector)
  }

  querySelector(selector: string) {
    return this.querySelectorAll(selector)[0] ?? null
  }
}

const hidden = new FakeElement('[data-hidden]', 0, 0, [])
const ready = new FakeElement('[data-ready]', 0, 0, [
  { width: 12, height: 12, top: 0, right: 12, bottom: 12, left: 0 },
])

assert.equal(isReadyTarget(hidden as unknown as HTMLElement), false)
assert.equal(isReadyTarget(ready as unknown as HTMLElement), true)

const doc = new FakeDocument([hidden, ready])
assert.equal(
  findFirstReadySelector(['[data-hidden]', '[data-ready]'], doc as unknown as Document),
  ready,
)

const wrapper = new FakeElement('[data-tutorial-id="generate.lang_picker"]', 300, 100, [])
const hiddenChoice = new FakeElement('.gen-orb', 0, 0, [])
const visibleChoice = new FakeElement('.gen-orb', 124, 124, [])
wrapper.append(hiddenChoice)
wrapper.append(visibleChoice)
const descendantDoc = new FakeDocument([wrapper])

assert.equal(
  findFirstReadyDescendant(
    '[data-tutorial-id="generate.lang_picker"]',
    ['.gen-orb'],
    descendantDoc as unknown as Document,
  ),
  visibleChoice,
)

const actionParent = new FakeElement('.actions', 220, 100, [])
const primary = new FakeElement('[data-tutorial-id="generate.quick_generate_button"]', 120, 48, [])
const secondary = new FakeElement('[data-tutorial-id="generate.customize_button"]', 100, 40, [])
actionParent.append(primary)
actionParent.append(secondary)
const actionDoc = new FakeDocument([primary, secondary])

assert.equal(getActionChoiceTarget(actionDoc as unknown as Document), actionParent)
assert.equal(getElementRadius(visibleChoice as unknown as HTMLElement, 16), 62)

const t = (key: string) => key
const generateTutorial = createGenerateTutorial(t)
const stepIds = generateTutorial.steps.map((step) => step.tutorialStepId)

assert.deepEqual(stepIds, [
  'language',
  'product',
  'category',
  'manual',
  'action-choice',
  'complete',
])
assert.equal(generateTutorial.steps.length, 6)
assert.equal(generateTutorial.steps[4].popover?.description, 'tutorial.generate.step5.caption')

console.log('tutorial v3 helper checks passed')
