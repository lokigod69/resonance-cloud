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
const categoryStyles = read('src/pages/categories/Categories.module.css')
const bridge = read('src/lib/curriculumDeckBridge.ts')
const staticLibraryLanguage = read('src/lib/staticLibraryLanguage.ts')

assertIncludes(translations, "'nav.categories': 'Library'", 'English nav')
assertIncludes(translations, "'nav.categories': 'Wortschatz'", 'German nav')
assertIncludes(translations, "'categories.title': 'Library / Wortschatz'", 'English page title')
assertIncludes(translations, "'categories.title': 'Wortschatz'", 'German page title')
assertIncludes(translations, "'categories.thematicSectionTitle': 'Theme Packs'", 'English thematic heading')
assertIncludes(translations, "'categories.thematicSectionTitle': 'Themenpakete'", 'German thematic heading')
assertIncludes(translations, "'categories.legacySectionTitle': 'Basic Vocabulary'", 'English basic heading')
assertIncludes(translations, "'categories.legacySectionTitle': 'Basiswortschatz'", 'German basic heading')
assertIncludes(translations, "'categories.importLevel': 'Import level'", 'English import CTA')
assertIncludes(translations, "'categories.importLevel': 'Level importieren'", 'German import CTA')
assertIncludes(translations, "'nav.categories': 'Bibliothèque'", 'French nav should use the library product label')

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

assertNotIncludes(categoryDetail, 'setTargetLanguage', 'Category detail duplicate language selector')
assertNotIncludes(categoryDetail, 'setHelperLanguage', 'Category detail duplicate language selector')
assertNotIncludes(categoryDetail, 'generateDeckFromCategory', 'Category detail generate CTA')
assertNotIncludes(categoryDetail, 'staticWordChip', 'Category detail word-chip spoilers')
assertIncludes(categoryDetail, 'levelPreviewGrid', 'Category detail level preview cards')
assertIncludes(categoryDetail, 'levelPreviewCollage', 'Category detail image preview collage')
assertIncludes(categoryDetail, 'levelPreviewTitle', 'Category detail level title styling')
assertIncludes(categoryDetail, 'getLocalizedStaticLevelLabel(level, locale)', 'Category detail should localize static level titles')
assertNotIncludes(categoryDetail, '{category.description}', 'Static category detail should not render generic generated descriptions')
assertNotIncludes(categoryDetail, "t('categories.levelLabel'", 'Category detail should not repeat Level X text on static level cards')
assertNotIncludes(categoryDetail, 'categories.openLevelAction', 'Category detail should not render redundant open-level CTA copy')

assertNotIncludes(levelDetail, 'setTargetLanguage', 'Level detail duplicate language selector')
assertNotIncludes(levelDetail, 'setHelperLanguage', 'Level detail duplicate language selector')
assertNotIncludes(levelDetail, '/generate?category=', 'Level detail static generate route')
assertIncludes(levelDetail, 'importStaticCategoryLevel', 'Level detail static import path')
assertIncludes(levelDetail, 'StaticCategoryEntryDetailModal', 'Level detail static word modal')
assertIncludes(levelDetail, 'onClick={() => setSelectedItem(item)}', 'Static word cards should be clickable')
assertIncludes(levelDetail, 'localizedLevelLabel', 'Static level detail should make the level title primary')
assertIncludes(levelDetail, 'staticImportAction', 'Static level import button should carry stronger visual weight')
assertIncludes(levelDetail, 'staticWordCopy', 'Static word cards should use clean word/translation copy')
assertIncludes(levelDetail, 'staticWordTranslation', 'Static word cards should show readable translations')
assertIncludes(levelDetail, 'shouldShowStaticHelperTerm(item)', 'Static word cards should intentionally hide same-language duplicate translations')
assertIncludes(levelDetail, 'Play Serafina pronunciation', 'Static TTS buttons should still render')
assertNotIncludes(levelDetail, 'formatSelectedCategoryVocabularyLabel', 'Static word cards should not render repeated word/translation pair labels')
assertNotIncludes(levelDetail, 'styles.enrichment', 'Static word cards should not render metadata enrichment blocks')
assertNotIncludes(levelDetail, "t('categories.staticSense')", 'Static word cards/modal should hide raw category sense metadata')
assertNotIncludes(levelDetail, "t('categories.modal.partOfSpeech')", 'Static word cards should hide POS metadata')

assertIncludes(staticLibraryLanguage, 'getLocalizedStaticLevelLabel', 'Static taxonomy localization helper')
assertIncludes(staticLibraryLanguage, 'shouldShowStaticHelperTerm', 'Same-language translation visibility helper')
assertNotIncludes(categoryStyles, '.levelPreviewCard:hover {\n  transform:', 'Level card hover should not move image boxes')
assertNotIncludes(categoryStyles, '.staticWordCard:hover {\n  transform:', 'Static word card hover should not move image boxes')
assertNotIncludes(categoryStyles, '.tile:hover {\n  transform:', 'Library tile hover should not move image boxes')

assertIncludes(bridge, 'buildStaticCategoryImportPayload', 'Static import bridge')
assertIncludes(bridge, 'importStaticCategoryLevel', 'Static import bridge')
assertIncludes(bridge, '.eq(\'target_language\', targetLanguage)', 'Static imported deck lookup should be target-language scoped')
assertIncludes(bridge, "source: 'static_thematic_library'", 'Static import metadata source')
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
