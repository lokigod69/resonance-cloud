import CardDetailModal, { type CardDetailField, type CardDetailModel } from '@/components/common/CardDetailModal'
import { curriculumEntryImagePath } from '@/lib/curriculumImagePath'
import {
  resolveCurriculumImageSetAsset,
  type CurriculumImageSetKey,
} from '@/lib/curriculumImageSets'
import { useTranslation } from '@/hooks/useTranslation'
import {
  getCurriculumCategoryBySlug,
  getCurriculumGloss,
  type CurriculumEnrichmentEntry,
  type CurriculumEntry,
} from '@/data/curriculumCategories'

type CurriculumEntryDetailModalProps = {
  entry: CurriculumEntry | null
  enrichment: CurriculumEnrichmentEntry | null
  categorySlug: string
  languageIso: string
  baseLanguageIso: string
  // Admin-resolved active image set for this language/category.
  activeImageSet?: CurriculumImageSetKey
  onClose: () => void
}

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function nonEmpty(value: string[] | null | undefined): string[] {
  return (value ?? []).map((item) => item.trim()).filter(Boolean)
}

function posLabel(pos: string, t: (key: string) => string): string {
  const key = `category.pos.${pos}`
  const translated = t(key)
  return translated === key ? pos : translated
}

function booleanLabel(value: boolean, t: (key: string) => string): string {
  return t(value ? 'categories.modal.yes' : 'categories.modal.no')
}

export default function CurriculumEntryDetailModal({
  entry,
  enrichment,
  categorySlug,
  languageIso,
  baseLanguageIso,
  activeImageSet,
  onClose,
}: CurriculumEntryDetailModalProps) {
  const { t } = useTranslation()

  if (!entry) {
    return <CardDetailModal model={null} onClose={onClose} />
  }

  const category = getCurriculumCategoryBySlug(categorySlug)
  const perSource = enrichment?.per_source?.[baseLanguageIso] ?? enrichment?.per_source?.de
  const sections: CardDetailField[] = []
  const chipsBelowTitle: string[] = []

  const commonMistake = clean(perSource?.common_mistake)
  if (commonMistake) {
    sections.push({
      key: 'common-mistake',
      label: t('categories.modal.commonMistake'),
      value: commonMistake,
    })
  }

  const etymology = clean(enrichment?.etymology)
  if (etymology) {
    sections.push({
      key: 'etymology',
      label: t('categories.modal.etymology'),
      value: etymology,
    })
  }

  const synonyms = nonEmpty(enrichment?.synonyms)
  if (synonyms.length > 0) {
    sections.push({
      key: 'synonyms',
      label: t('categories.modal.synonyms'),
      value: synonyms,
      tone: 'chip',
    })
  }

  const collocations = nonEmpty(enrichment?.collocations)
  if (collocations.length > 0) {
    sections.push({
      key: 'collocations',
      label: t('categories.modal.collocations'),
      value: collocations,
    })
  }

  const falseFriends = (perSource?.false_friends ?? [])
    .map((item) => {
      const sourceTerm = clean(item.source_term)
      const note = clean(item.note)
      if (!sourceTerm && !note) return null
      return sourceTerm && note ? `${sourceTerm}: ${note}` : sourceTerm ?? note
    })
    .filter((item): item is string => Boolean(item))
  if (falseFriends.length > 0) {
    sections.push({
      key: 'false-friends',
      label: t('categories.modal.falseFriends'),
      value: falseFriends,
    })
  }

  if (enrichment?.pos === 'noun') {
    const nounFields: string[] = []
    const plural = clean(enrichment.plural)
    const gender = clean(enrichment.gender)
    if (plural) nounFields.push(`${t('categories.modal.plural')}: ${plural}`)
    if (gender) nounFields.push(`${t('categories.modal.gender')}: ${gender}`)
    if (enrichment.countable === false) nounFields.push(t('categories.modal.uncountable'))
    if (nounFields.length > 0) {
      sections.push({
        key: 'noun-fields',
        label: t('categories.modal.partOfSpeech'),
        value: nounFields,
      })
    }
  }

  if (enrichment?.pos === 'verb') {
    const verbFields: string[] = []
    if (typeof enrichment.is_irregular === 'boolean') {
      verbFields.push(`${t('categories.modal.isIrregular')}: ${booleanLabel(enrichment.is_irregular, t)}`)
    }
    const casePattern = clean(enrichment.case_pattern)
    if (casePattern) verbFields.push(`${t('categories.modal.casePattern')}: ${casePattern}`)
    if (verbFields.length > 0) {
      sections.push({
        key: 'verb-fields',
        label: t('categories.modal.partOfSpeech'),
        value: verbFields,
      })
    }
  }

  if (enrichment?.pos === 'adjective') {
    const adjectiveFields: string[] = []
    const comparative = clean(enrichment.comparative)
    const superlative = clean(enrichment.superlative)
    const antonym = clean(enrichment.antonym)
    if (comparative) adjectiveFields.push(`${t('categories.modal.comparative')}: ${comparative}`)
    if (superlative) adjectiveFields.push(`${t('categories.modal.superlative')}: ${superlative}`)
    if (antonym) adjectiveFields.push(`${t('categories.modal.antonym')}: ${antonym}`)
    if (adjectiveFields.length > 0) {
      sections.push({
        key: 'adjective-fields',
        label: t('categories.modal.partOfSpeech'),
        value: adjectiveFields,
      })
    }
  }

  if (enrichment?.pos === 'number') {
    const ordinalForm = clean(enrichment.ordinal_form)
    if (ordinalForm) {
      sections.push({
        key: 'number-fields',
        label: t('categories.modal.ordinalForm'),
        value: ordinalForm,
      })
    }
  }

  const article = clean(enrichment?.article)
  if (article) chipsBelowTitle.push(article)

  const setResolution = activeImageSet
    ? resolveCurriculumImageSetAsset(entry.term, { activeSetKey: activeImageSet, languageIso })
    : null
  const imageSrc =
    setResolution?.publicPath ?? curriculumEntryImagePath(languageIso, categorySlug, entry.term)

  const model: CardDetailModel = {
    title: entry.term,
    ipa: clean(enrichment?.ipa) ?? undefined,
    posChip: enrichment?.pos ? { label: posLabel(enrichment.pos, t) } : undefined,
    image: {
      src: imageSrc,
      alt: t('categories.modal.imageAlt', { term: entry.term }),
      fallbackEmoji: category?.icon,
      aspect: '16:9',
    },
    primaryText: getCurriculumGloss(entry, baseLanguageIso),
    highlightText: clean(perSource?.mnemonic) ?? undefined,
    exampleBlock: clean(enrichment?.example)
      ? {
          target: clean(enrichment?.example) ?? '',
          base: clean(perSource?.example_gloss) ?? undefined,
        }
      : undefined,
    sections,
    chipsBelowTitle,
  }

  return <CardDetailModal model={model} onClose={onClose} />
}
