import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

Object.assign(globalThis, { React })

const { default: ImagelessCard } = await import('../src/components/study/ImagelessCard')
const { default: ImagelessCardThumbnail } = await import('../src/components/study/ImagelessCardThumbnail')

const word = {
  id: 'word-1',
  word: 'Brot',
  translation: 'bread',
  ipa: 'bRO:t',
  tts_audio_url: null,
  target_language: 'German',
}

const cardHtml = renderToStaticMarkup(
  <ImagelessCard
    word={word.word}
    translation={word.translation}
    ipa={word.ipa}
    revealed
    targetLanguage={word.target_language}
  />,
)

assert.match(cardHtml, /Brot/, 'text card face should show the target word')
assert.doesNotMatch(cardHtml, /bread/, 'text card face should not reveal the base-language translation')
assert.doesNotMatch(cardHtml, /bRO:t/, 'text card face should not reveal IPA pronunciation guidance')

const thumbnailHtml = renderToStaticMarkup(
  <ImagelessCardThumbnail
    word={word.word}
    translation={word.translation}
    ipa={word.ipa}
    targetLanguage={word.target_language}
  />,
)

assert.match(thumbnailHtml, /Brot/, 'text deck thumbnail should show the target word')
assert.doesNotMatch(thumbnailHtml, /bread/, 'text deck thumbnail should not show the translation')
assert.doesNotMatch(thumbnailHtml, /bRO:t/, 'text deck thumbnail should not show IPA')

const modalSource = readFileSync(resolve(process.cwd(), 'src/components/ImagelessCardViewerModal.tsx'), 'utf8')
const studyFlashcardSource = readFileSync(resolve(process.cwd(), 'src/pages/StudyFlashcard.tsx'), 'utf8')

assert.match(modalSource, /data-imageless-modal-details/, 'text card modal should render a dedicated answer detail area')
assert.match(modalSource, /word\.translation/, 'text card modal should show the base-language translation')
assert.match(modalSource, /word\.ipa/, 'text card modal should show IPA pronunciation guidance')

const modalIpaIndex = modalSource.indexOf('{cleanIpa &&')
const modalTranslationIndex = modalSource.indexOf('{cleanTranslation &&')
assert.ok(
  modalIpaIndex >= 0 && modalTranslationIndex >= 0 && modalIpaIndex < modalTranslationIndex,
  'text card modal should show IPA between the target word and translation',
)

assert.doesNotMatch(
  studyFlashcardSource,
  /current\.deck_type\s*===\s*'card_text'\s*&&\s*revealed\s*\?\s*null/,
  'text deck flashcards should use the reveal area instead of hiding answer details',
)
assert.match(
  studyFlashcardSource,
  /current\.deck_type\s*===\s*'card_text'[\s\S]*?current\.ipa/,
  'text deck flashcard reveal area should include IPA guidance',
)

console.log('imageless card display contract checks passed')
