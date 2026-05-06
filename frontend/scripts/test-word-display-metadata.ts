/**
 * Static test for the resolveCardLearningMetadata helper.
 *
 * Covers: top-level columns, visual_card_plan shape, gpt_image_2_card shape,
 * legacy `example`/`example_gloss` fallback, missing fields, malformed
 * metadata, and admin-debug projection.
 *
 * Run:  npm run test:word-metadata
 */

import { resolveCardLearningMetadata, type WordLike } from '../src/lib/wordDisplayMetadata.ts'

let failures = 0
let passes = 0

function assert(name: string, cond: boolean, detail?: unknown) {
  if (cond) {
    passes += 1
    console.log(`  ok  ${name}`)
  } else {
    failures += 1
    console.error(`  FAIL ${name}`)
    if (detail !== undefined) console.error('       ', detail)
  }
}

console.log('\n[empty word]')
{
  const r = resolveCardLearningMetadata({})
  assert('mnemonic undefined', r.mnemonic === undefined)
  assert('etymology undefined', r.etymology === undefined)
  assert('partOfSpeech undefined', r.partOfSpeech === undefined)
  assert('usageExample undefined', r.usageExample === undefined)
  assert('adminDebug present', r.adminDebug !== undefined)
  assert('adminDebug.visualCardPlan null', r.adminDebug.visualCardPlan === null)
  assert('adminDebug.gptImage2Card null', r.adminDebug.gptImage2Card === null)
}

console.log('\n[null word and undefined word]')
{
  const a = resolveCardLearningMetadata(null)
  const b = resolveCardLearningMetadata(undefined)
  assert('null returns object with adminDebug', a.adminDebug !== undefined)
  assert('undefined returns object with adminDebug', b.adminDebug !== undefined)
}

console.log('\n[top-level only — legacy row before metadata pipeline]')
{
  const word: WordLike = {
    mnemonic: 'Think dis-ease = not at ease.',
    etymology: 'From Old French desaise.',
    pos: 'noun',
    article: 'die',
    example: 'Sie spürte ein Unbehagen.',
    example_gloss: 'She felt a discomfort.',
    metadata: null,
  }
  const r = resolveCardLearningMetadata(word)
  assert('mnemonic top-level', r.mnemonic === 'Think dis-ease = not at ease.')
  assert('etymology top-level', r.etymology === 'From Old French desaise.')
  assert('partOfSpeech top-level', r.partOfSpeech === 'noun')
  assert('article top-level', r.article === 'die')
  assert(
    'usageExample built from legacy example pair',
    r.usageExample?.target === 'Sie spürte ein Unbehagen.'
      && r.usageExample?.base === 'She felt a discomfort.',
    r.usageExample,
  )
}

console.log('\n[visual_card_plan with usage_example object]')
{
  const word: WordLike = {
    mnemonic: '',
    etymology: '',
    pos: 'noun',
    metadata: {
      visual_card_plan: {
        prompt_version: 'quick_generate_v1',
        image_scene: 'a child gazing through a frosted window',
        mnemonic: 'Heimweh = home + woe.',
        etymology: 'German Heim (home) + Weh (woe), 18th c.',
        usage_example: {
          target: 'Auf Reisen bekam er Heimweh.',
          l1: 'On his travels he became homesick.',
        },
        renderer_profile: 'balanced_teaching',
        renderer_profile_source: 'auto',
        answer_visibility: 'hidden',
        premium_quick_mode: 'memorable',
        backend_template: 'direct_prompt_v2',
      },
    },
  }
  const r = resolveCardLearningMetadata(word)
  assert(
    'mnemonic from visual_card_plan when top-level empty',
    r.mnemonic === 'Heimweh = home + woe.',
  )
  assert(
    'etymology from visual_card_plan when top-level empty',
    r.etymology === 'German Heim (home) + Weh (woe), 18th c.',
  )
  assert(
    'usageExample.target',
    r.usageExample?.target === 'Auf Reisen bekam er Heimweh.',
  )
  assert(
    'usageExample.base from l1',
    r.usageExample?.base === 'On his travels he became homesick.',
  )
  assert(
    'imageScene from visual_card_plan',
    r.imageScene === 'a child gazing through a frosted window',
  )
  assert(
    'adminDebug.fields.rendererProfile = balanced_teaching',
    r.adminDebug.fields.rendererProfile === 'balanced_teaching',
  )
  assert(
    'adminDebug.fields.rendererProfileSource = auto',
    r.adminDebug.fields.rendererProfileSource === 'auto',
  )
  assert(
    'adminDebug.visualCardPlan blob preserved',
    r.adminDebug.visualCardPlan?.prompt_version === 'quick_generate_v1',
  )
}

console.log('\n[gpt_image_2_card with usage_example object — Premium card]')
{
  const word: WordLike = {
    mnemonic: 'Premium-rendered hook.', // top-level overwritten by card_worker post-render
    pos: 'noun',
    card_image_model: 'gpt_image_2',
    metadata: {
      visual_card_plan: {
        mnemonic: 'old enrichment hook',
        usage_example: { target: 'older sentence', l1: 'older translation' },
      },
      gpt_image_2_card: {
        prompt_version: 'gpt2_v1',
        renderer_profile: 'balanced_teaching',
        renderer_profile_source: 'auto',
        image_scene: 'frosted window child',
        card_scene_displayed: 'frosted window child',
        mnemonic: 'Premium-rendered hook.',
        displayed_mnemonic: 'Premium-rendered hook.',
        mnemonic_confidence: 'helpful',
        etymology: 'German Heim + Weh',
        usage_example: { target: 'GPT target sentence.', l1: 'GPT base sentence.' },
        composition: 'single',
        treatment: 'embodied',
        creative_mode: 'cinematic_microstory',
        text_embedding_mode: 'none',
        layer2_candidate_text_mode: false,
        single_image_teachable: true,
        dominant_emotional_reading: 'longing',
        register_note: null,
        rationale_summary: 'A child looks out at distant land they once called home.',
        final_provider_prompt_sha256: 'deadbeef0000',
        answer_visibility: 'hidden',
        premium_quick_mode: 'memorable',
        backend_template: 'direct_prompt_v2',
      },
    },
  }
  const r = resolveCardLearningMetadata(word)
  assert(
    'mnemonic prefers top-level (post-render rewrite)',
    r.mnemonic === 'Premium-rendered hook.',
  )
  assert(
    'usageExample prefers gpt_image_2_card',
    r.usageExample?.target === 'GPT target sentence.'
      && r.usageExample?.base === 'GPT base sentence.',
  )
  assert(
    'cardSceneDisplayed from gpt_image_2_card',
    r.cardSceneDisplayed === 'frosted window child',
  )
  assert(
    'adminDebug.fields.composition = single',
    r.adminDebug.fields.composition === 'single',
  )
  assert(
    'adminDebug.fields.treatment = embodied',
    r.adminDebug.fields.treatment === 'embodied',
  )
  assert(
    'adminDebug.fields.creativeMode = cinematic_microstory',
    r.adminDebug.fields.creativeMode === 'cinematic_microstory',
  )
  assert(
    'adminDebug.fields.textEmbeddingMode = none',
    r.adminDebug.fields.textEmbeddingMode === 'none',
  )
  assert(
    'adminDebug.fields.finalProviderPromptSha256 surfaced',
    r.adminDebug.fields.finalProviderPromptSha256 === 'deadbeef0000',
  )
  assert(
    'adminDebug.fields.singleImageTeachable = true',
    r.adminDebug.fields.singleImageTeachable === true,
  )
  assert(
    'adminDebug.fields.layer2CandidateTextMode = false',
    r.adminDebug.fields.layer2CandidateTextMode === false,
  )
  assert(
    'adminDebug.fields.cardImageModel = gpt_image_2',
    r.adminDebug.fields.cardImageModel === 'gpt_image_2',
  )
  assert(
    'adminDebug.fields.generationMode = Memorable · LLM V2',
    r.adminDebug.fields.generationMode === 'Memorable · LLM V2',
    r.adminDebug.fields,
  )
  assert(
    'adminDebug.gptImage2Card blob preserved',
    r.adminDebug.gptImage2Card?.prompt_version === 'gpt2_v1',
  )
}

console.log('\n[missing usage example — empty {target:"", l1:""} should NOT surface]')
{
  const word: WordLike = {
    pos: 'noun',
    metadata: {
      visual_card_plan: {
        usage_example: { target: '', l1: '' },
      },
    },
  }
  const r = resolveCardLearningMetadata(word)
  assert('usageExample undefined when both sides empty', r.usageExample === undefined)
}

console.log('\n[missing mnemonic — should NOT surface a generic placeholder]')
{
  const word: WordLike = {
    pos: 'verb',
    mnemonic: '',
    metadata: {
      visual_card_plan: {
        mnemonic: null,
      },
    },
  }
  const r = resolveCardLearningMetadata(word)
  assert('mnemonic undefined when null/empty everywhere', r.mnemonic === undefined)
}

console.log('\n[missing etymology — should NOT surface]')
{
  const word: WordLike = {
    pos: 'noun',
    etymology: '',
    metadata: {
      visual_card_plan: { etymology: '' },
    },
  }
  const r = resolveCardLearningMetadata(word)
  assert('etymology undefined when blank', r.etymology === undefined)
}

console.log('\n[malformed metadata]')
{
  // metadata is a string instead of an object — must not throw, must not leak.
  const word: WordLike = {
    pos: 'noun',
    metadata: 'not-an-object' as unknown,
  }
  const r = resolveCardLearningMetadata(word)
  assert('partOfSpeech still resolved', r.partOfSpeech === 'noun')
  assert('adminDebug.visualCardPlan null', r.adminDebug.visualCardPlan === null)
  assert('adminDebug.gptImage2Card null', r.adminDebug.gptImage2Card === null)
  assert('no usageExample', r.usageExample === undefined)
}

console.log('\n[malformed visual_card_plan.usage_example — string instead of object]')
{
  const word: WordLike = {
    metadata: {
      visual_card_plan: {
        usage_example: 'just a string',
      },
    },
  }
  const r = resolveCardLearningMetadata(word)
  assert('malformed usage_example ignored', r.usageExample === undefined)
}

console.log('\n[only base side present]')
{
  const word: WordLike = {
    metadata: {
      visual_card_plan: {
        usage_example: { target: '', l1: 'Translation only.' },
      },
    },
  }
  const r = resolveCardLearningMetadata(word)
  assert('usageExample.base alone', r.usageExample?.target === undefined)
  assert('usageExample.base alone has base', r.usageExample?.base === 'Translation only.')
}

console.log('\n[only target side present]')
{
  const word: WordLike = {
    metadata: {
      visual_card_plan: {
        usage_example: { target: 'Sentence only.', l1: '' },
      },
    },
  }
  const r = resolveCardLearningMetadata(word)
  assert('usageExample.target alone', r.usageExample?.target === 'Sentence only.')
  assert('usageExample.target alone has no base', r.usageExample?.base === undefined)
}

console.log(`\n${passes} passed, ${failures} failed`)
if (failures > 0) process.exit(1)
