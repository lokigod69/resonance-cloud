import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()

function read(path: string): string {
  return readFileSync(resolve(root, path), 'utf8')
}

function assertIncludes(source: string, needle: string, label: string) {
  assert.ok(source.includes(needle), `${label}: expected to find ${needle}`)
}

function assertNotIncludes(source: string, needle: string, label: string) {
  assert.ok(!source.includes(needle), `${label}: should not contain ${needle}`)
}

const translations = read('src/lib/translations.ts')
const categoryList = read('src/pages/categories/CategoryListPage.tsx')
const categoryDetail = read('src/pages/categories/CategoryDetailPage.tsx')
const levelDetail = read('src/pages/categories/LevelDetailPage.tsx')
const staticLevelDetail = levelDetail.slice(levelDetail.indexOf('function StaticLevelDetail'))
const categoryStyles = read('src/pages/categories/Categories.module.css')
const cardDetailModal = read('src/components/common/CardDetailModal.tsx')
const bridge = read('src/lib/curriculumDeckBridge.ts')
const staticLibraryLanguage = read('src/lib/staticLibraryLanguage.ts')
const scrollResetHook = read('src/pages/categories/useCategoryScrollReset.ts')

assertIncludes(translations, "'nav.categories': 'Library'", 'English nav')
assertIncludes(translations, "'nav.categories': 'Wortschatz'", 'German nav')
assertIncludes(translations, "'categories.title': 'Library'", 'English page title')
assertIncludes(translations, "'categories.title': 'Wortschatz'", 'German page title')
assertIncludes(translations, "'categories.thematicSectionTitle': 'Theme Packs'", 'English thematic heading')
assertIncludes(translations, "'categories.thematicSectionTitle': 'Themenpakete'", 'German thematic heading')
assertIncludes(translations, "'categories.legacySectionTitle': 'Basic Vocabulary'", 'English basic heading')
assertIncludes(translations, "'categories.legacySectionTitle': 'Basiswortschatz'", 'German basic heading')
assertIncludes(translations, "'categories.importLevel': 'Import Cards'", 'English import CTA')
assertIncludes(translations, "'categories.importLevel': 'Karten importieren'", 'German import CTA')
assertIncludes(translations, "'nav.categories': 'Bibliothèque'", 'French nav should use the library product label')
assertIncludes(translations, "'categories.previousLevel': 'Previous Level'", 'English previous-level label')
assertIncludes(translations, "'categories.nextLevel': 'Next Level'", 'English next-level label')
assertIncludes(translations, "'categories.previousLevel': 'Vorheriges Level'", 'German previous-level label')
assertIncludes(translations, "'categories.nextLevel': 'Nächstes Level'", 'German next-level label')
assertIncludes(translations, "'categories.previousLevel': 'Niveau précédent'", 'French previous-level label')
assertIncludes(translations, "'categories.nextLevel': 'Niveau suivant'", 'French next-level label')

assertNotIncludes(categoryList, 'generateFromCategories', 'Library landing')
assertNotIncludes(categoryList, 'to="/generate"', 'Library landing')
assertNotIncludes(categoryList, "t('categories.subtitle')", 'Library landing generic subtitle copy')
assertNotIncludes(categoryList, 'categories.thematicSectionDescription', 'Library landing thematic generic subtitle copy')
assert.ok(
  categoryList.indexOf('thematic-static-categories') < categoryList.indexOf('legacy-curriculum-categories'),
  'thematic section should render before legacy/basic section',
)
assert.ok(
  categoryList.indexOf('targetLanguage') >= 0 && categoryList.indexOf('STATIC_CATEGORY_TARGET_LANGUAGES') >= 0,
  'Library landing should own target language selection',
)
assertIncludes(categoryList, 'useCategoryScrollReset()', 'Library landing should scroll to top on route entry')
assertIncludes(categoryList, 'aria-label={t(\'categories.targetLanguageLabel\')}', 'Target language select should keep an accessible label')
assertNotIncludes(categoryList, '<span>{t(\'categories.targetLanguageLabel\')}</span>', 'Target language select label should not render visibly')
assertNotIncludes(categoryList, "tp('categories.entryCount'", 'Library landing thematic cards should not repeat word counts')
assertNotIncludes(categoryList, "tp('categories.levelCount'", 'Library landing thematic cards should not repeat level counts')
assertNotIncludes(categoryList, 'categories.openCategoryAction', 'Library landing thematic cards should not render redundant open-category copy')
assertNotIncludes(categoryList, 'thematicGroupLabel', 'Library landing thematic cards should not repeat parent group labels')

assertNotIncludes(categoryDetail, 'setTargetLanguage', 'Category detail duplicate language selector')
assertNotIncludes(categoryDetail, 'setHelperLanguage', 'Category detail duplicate language selector')
assertNotIncludes(categoryDetail, 'generateDeckFromCategory', 'Category detail generate CTA')
assertNotIncludes(categoryDetail, 'staticWordChip', 'Category detail word-chip spoilers')
assertIncludes(categoryDetail, 'levelPreviewGrid', 'Category detail level preview cards')
assertIncludes(categoryDetail, 'levelPreviewCollage', 'Category detail image preview collage')
assertIncludes(categoryDetail, 'levelPreviewTitle', 'Category detail level title styling')
assertIncludes(categoryDetail, 'getLocalizedStaticLevelLabel(level, locale)', 'Category detail should localize static level titles')
assertNotIncludes(categoryDetail, '{category.description}', 'Static category detail should not render generic generated descriptions')
assertIncludes(categoryDetail, 'useCategoryScrollReset()', 'Category detail should scroll to top on route entry')
assertNotIncludes(categoryDetail, '{t(group.groupKey)}', 'Static category detail hero should not render parent group labels')
assertNotIncludes(categoryDetail, "tp('categories.entryCount', level.words.length)", 'Static category detail level cards should not repeat per-level word counts')
assertNotIncludes(categoryDetail, "t('categories.levelLabel'", 'Category detail should not repeat Level X text on static level cards')
assertNotIncludes(categoryDetail, 'categories.openLevelAction', 'Category detail should not render redundant open-level CTA copy')

assertNotIncludes(levelDetail, 'setTargetLanguage', 'Level detail duplicate language selector')
assertNotIncludes(levelDetail, 'setHelperLanguage', 'Level detail duplicate language selector')
assertNotIncludes(levelDetail, '/generate?category=', 'Level detail static generate route')
assertIncludes(levelDetail, 'importStaticCategoryLevel', 'Level detail static import path')
assertIncludes(levelDetail, 'StaticCategoryEntryDetailModal', 'Level detail static word modal')
assertIncludes(levelDetail, 'onClick={() => setSelectedItem(item)}', 'Static word cards should be clickable')
assertIncludes(levelDetail, 'localizedLevelLabel', 'Static level detail should make the level title primary')
assertIncludes(staticLevelDetail, 'staticImportAction', 'Static level import button should carry stronger visual weight')
assertIncludes(staticLevelDetail, 'staticImportPanel', 'Static level import button should sit in a distinct panel below the hero copy')
assertNotIncludes(staticLevelDetail, 'styles.heroAction', 'Static level import button should not live in the top-right hero action slot')
assert.ok(
  staticLevelDetail.indexOf('styles.detailHero') < staticLevelDetail.indexOf('styles.staticImportPanel')
    && staticLevelDetail.indexOf('styles.staticImportPanel') < staticLevelDetail.indexOf('styles.staticWordGrid'),
  'Static level import panel should render between the hero and the card grid',
)
assertIncludes(levelDetail, 'LevelNavigation', 'Level detail should render previous/next level navigation')
assertIncludes(levelDetail, 'previousLevelHref', 'Level detail should compute previous-level navigation')
assertIncludes(levelDetail, 'nextLevelHref', 'Level detail should compute next-level navigation')
assertIncludes(levelDetail, 'staticLibraryRouteSuffix(targetLanguage)', 'Static level navigation should preserve targetLanguage')
assertIncludes(levelDetail, "t('categories.previousLevel')", 'Previous-level label should be localized')
assertIncludes(levelDetail, "t('categories.nextLevel')", 'Next-level label should be localized')
assertIncludes(levelDetail, 'useCategoryScrollReset()', 'Level detail should scroll to top on route entry and previous/next navigation')
assertIncludes(levelDetail, 'importLabel', 'Import/open deck button should remain visible')
assertIncludes(levelDetail, 'staticWordCopy', 'Static word cards should use clean word/translation copy')
assertIncludes(levelDetail, 'staticWordTranslation', 'Static word cards should show readable translations')
assertIncludes(levelDetail, 'shouldShowStaticHelperTerm(item)', 'Static word cards should intentionally hide same-language duplicate translations')
assertIncludes(levelDetail, 'dedupeTargetTerms: false', 'Static library level rendering should preserve source entry counts even when translations duplicate')
assertIncludes(levelDetail, 'Play Serafina pronunciation', 'Static TTS buttons should still render')
assertNotIncludes(levelDetail, 'formatSelectedCategoryVocabularyLabel', 'Static word cards should not render repeated word/translation pair labels')
assertNotIncludes(levelDetail, 'styles.enrichment', 'Static word cards should not render metadata enrichment blocks')
assertNotIncludes(levelDetail, "t('categories.staticSense')", 'Static word cards/modal should hide raw category sense metadata')
assertNotIncludes(levelDetail, "t('categories.modal.partOfSpeech')", 'Static word cards should hide POS metadata')
assertNotIncludes(levelDetail, 't(group.groupKey)', 'Static level detail hero should not render parent group labels')

assertIncludes(staticLibraryLanguage, 'getLocalizedStaticLevelLabel', 'Static taxonomy localization helper')
assertIncludes(staticLibraryLanguage, 'shouldShowStaticHelperTerm', 'Same-language translation visibility helper')
assertIncludes(staticLibraryLanguage, 'isFallback', 'Missing helper translations should be intentionally hidden without dropping cards')
assertIncludes(scrollResetHook, 'window.scrollTo({ top: 0, left: 0', 'Category scroll reset should return route-click navigation to the top')
assertNotIncludes(categoryStyles, '.levelPreviewCard:hover {\n  transform:', 'Level card hover should not move image boxes')
assertNotIncludes(categoryStyles, '.staticWordCard:hover {\n  transform:', 'Static word card hover should not move image boxes')
assertNotIncludes(categoryStyles, '.tile:hover {\n  transform:', 'Library tile hover should not move image boxes')

assertIncludes(categoryStyles, '.levelNavBar', 'Level navigation bar styling')
assertIncludes(categoryStyles, '.levelNavPill', 'Level navigation pill styling')
assertIncludes(categoryStyles, '.levelNavPill:hover', 'Level navigation hover state')
assertIncludes(cardDetailModal, 'card-detail-close-row', 'Modal close should live in modal chrome')
assertIncludes(cardDetailModal, 'card-detail-close-button', 'Modal close button should have an integrated control class')
assertIncludes(cardDetailModal, 'aria-label={t(\'categories.modal.close\')}', 'Modal close button accessible label')
assertIncludes(cardDetailModal, "event.key === 'Escape'", 'Modal should keep Escape-to-close behavior')
assertIncludes(cardDetailModal, 'onClick={onClose}', 'Modal should keep outside click and button close behavior')
assertIncludes(cardDetailModal, 'ModalImage image={model.image}', 'Modal image should still render')
assert.ok(
  cardDetailModal.indexOf('card-detail-close-row') < cardDetailModal.indexOf('ModalImage image={model.image}'),
  'Modal close chrome should render outside/before image content',
)

assertIncludes(bridge, 'buildStaticCategoryImportPayload', 'Static import bridge')
assertIncludes(bridge, 'importStaticCategoryLevel', 'Static import bridge')
assertIncludes(bridge, '.eq(\'target_language\', targetLanguage)', 'Static imported deck lookup should be target-language scoped')
assertIncludes(bridge, "source: 'static_thematic_library'", 'Static import metadata source')
assertIncludes(bridge, 'dedupeTargetTerms: false', 'Static import should preserve source entry counts even when translations duplicate')
assertIncludes(bridge, "supabase.rpc('submit_curriculum_import'", 'Static import should reuse no-credit RPC')
assertNotIncludes(bridge, "supabase.rpc('submit_generation'", 'Static import must not call generation')
assertNotIncludes(bridge, "from('generation_jobs')", 'Static import must not create generation jobs directly')
assertNotIncludes(bridge, "from('profiles')", 'Static import must not touch credits/profile rows')

assert.ok(
  existsSync(resolve(root, 'public/curriculum/generated-categories/en/animals/entries/dog.webp')),
  'Animals Level 1 image path should resolve for imported word cards',
)

const migrations = readdirSync(resolve(root, 'supabase/migrations'))
const staticImportMigration = migrations.find((name) => name.endsWith('_static_library_import_target_language_idempotency.sql'))
assert.ok(staticImportMigration, 'static library import target-language idempotency migration should exist')
const staticImportSql = read(`supabase/migrations/${staticImportMigration}`)
assertIncludes(staticImportSql, 'v_user_id::text || \':curriculum:\' || p_category_slug || \':\' || p_level_number::text || \':\' || p_target_language', 'static import migration lock')
assertIncludes(staticImportSql, 'and target_language = p_target_language', 'static import migration lookup')
assertNotIncludes(staticImportSql, 'generation_jobs', 'static import migration must not touch generation jobs')
assertNotIncludes(staticImportSql, 'update public.profiles', 'static import migration must not debit credits')

console.log('test-vocabulary-library-contract: OK')
