const copy = {
  en: {
    prototype: 'Reader study · local preview', base: 'Explain in', eyebrow: 'SMALL STORIES. WIDER WORLDS.',
    headline: 'Follow your curiosity.', lede: 'Read a little. Look closer. Find a new way to say it.',
    directions: 'Choose a reader treatment', atlas: 'Atlas', folio: 'Folio', stage: 'Stage',
    collection: 'Your next small adventure', language: 'Read in', level: 'Level', all: 'All levels',
    libraryNote: 'Original fiction. Six pages at a time. Choose any world.', restart: 'Start again',
    wordPocket: 'A few words before you go', showMeanings: 'Show meanings', lookCloser: 'LOOK CLOSER',
    sceneHint: 'Tap a detail to explore its words.', artPlaceholder: 'Scene study · illustration to follow',
    readHint: 'Tap a line for its meaning and a language note.', notice: 'A LITTLE DISCOVERY',
    listen: 'Listen', audioPending: 'Recording pending', previous: '← Previous', next: 'Next page →',
    finish: 'Close the story →', ending: 'The story stays with you.', endingHint: 'Return to any page, or open another world.',
    nextStory: 'Another story →', aboutStory: 'About this story',
    previewNote: 'English and German explanations are available in this study. Audio, illustrations and other explanation languages are still to come. The three reader treatments await your choice.',
    narrator: 'Narrator', titleNote: 'The title is part of the story’s recording list.',
    objectNote: 'Look for this detail in the scene.', wordNote: 'A word to recognise as you read.',
    page: (n, total) => `Page ${n} of ${total}`, pageLabel: n => `Go to page ${n}`,
    error: 'The stories could not be loaded. Reload after the local draft files are ready.',
    resume: n => `Continue on page ${n}`, storyPages: 'Story pages', skip: 'Skip to story',
    worlds: {culture: 'Everyday life', ocean: 'Ocean', 'deep-time': 'Deep time', cosmos: 'Cosmos', absurd: 'A little absurd', fables: 'Animal fables'},
  },
  de: {
    prototype: 'Lesestudie · lokale Vorschau', base: 'Erklärungen auf', eyebrow: 'KLEINE GESCHICHTEN. WEITE WELTEN.',
    headline: 'Folge deiner Neugier.', lede: 'Lies ein Stück. Schau genauer hin. Entdecke neue Worte.',
    directions: 'Wähle eine Leseansicht', atlas: 'Atlas', folio: 'Buchseite', stage: 'Bühne',
    collection: 'Dein nächstes kleines Abenteuer', language: 'Lesesprache', level: 'Niveau', all: 'Alle Niveaus',
    libraryNote: 'Neue Geschichten auf je sechs Seiten. Wähle deine Welt.', restart: 'Von vorne',
    wordPocket: 'Ein paar Wörter für unterwegs', showMeanings: 'Bedeutungen zeigen', lookCloser: 'SCHAU GENAUER HIN',
    sceneHint: 'Tippe auf ein Detail und entdecke seine Wörter.', artPlaceholder: 'Szenenentwurf · Illustration folgt',
    readHint: 'Tippe auf einen Satz für Bedeutung und Sprachhinweis.', notice: 'EINE KLEINE ENTDECKUNG',
    listen: 'Anhören', audioPending: 'Aufnahme folgt', previous: '← Zurück', next: 'Weiter →',
    finish: 'Geschichte abschließen →', ending: 'Die Geschichte bleibt bei dir.', endingHint: 'Blättere zurück oder öffne eine andere Welt.',
    nextStory: 'Nächste Geschichte →', aboutStory: 'Über diese Geschichte',
    previewNote: 'Diese Studie enthält englische und deutsche Erklärungen. Aufnahmen, Illustrationen und weitere Erklärungssprachen folgen. Die drei Leseansichten stehen zur Auswahl.',
    narrator: 'Erzähler', titleNote: 'Auch der Titel gehört zur Aufnahmeliste.',
    objectNote: 'Achte auf dieses Detail in der Szene.', wordNote: 'Dieses Wort begegnet dir beim Lesen.',
    page: (n, total) => `Seite ${n} von ${total}`, pageLabel: n => `Zu Seite ${n}`,
    error: 'Die Geschichten konnten nicht geladen werden. Lade die Vorschau neu, sobald die lokalen Entwürfe bereit sind.',
    resume: n => `Auf Seite ${n} weiterlesen`, storyPages: 'Geschichtenseiten', skip: 'Zur Geschichte',
    worlds: {culture: 'Alltag', ocean: 'Meer', 'deep-time': 'Erdgeschichte', cosmos: 'Kosmos', absurd: 'Ein bisschen absurd', fables: 'Tierfabeln'},
  },
}
const $ = id => document.getElementById(id)
let base = 'en', locale = 'en-GB', level = 'all', episodes = [], selected = null, pageIndex = 0, detail = null, completed = false
const t = key => copy[base][key]
const progressKey = 'lingwave-storybook-preview-progress-v1'
let progress = {}
try { const parsed = JSON.parse(localStorage.getItem(progressKey) || '{}'); if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) progress = parsed } catch { /* Reading remains available without storage. */ }
const save = () => { try { localStorage.setItem(progressKey, JSON.stringify(progress)) } catch { /* Optional preview resume only. */ } }
const setText = (id, text) => { $(id).textContent = text }
function el(tag, className, text) { const node = document.createElement(tag); if (className) node.className = className; if (text != null) node.textContent = text; return node }
function button(className, onClick) { const b = el('button', className); b.type = 'button'; b.addEventListener('click', onClick); return b }
function visibleEpisodes() { return episodes.filter(e => e.locale === locale && (level === 'all' || level === e.level)) }
function refreshLevels() {
  for (const option of $('level').options) option.disabled = option.value !== 'all' && !episodes.some(e => e.locale === locale && e.level === option.value)
  if (!visibleEpisodes().length) { level = 'all'; $('level').value = 'all' }
}
function setDetail(item, noteKey = '') {
  detail = { item, noteKey }
  document.querySelectorAll('[data-entry]').forEach(node => node.setAttribute('aria-pressed', String(node.dataset.entry === item.id)))
  $('detail-text').lang = selected.locale
  setText('detail-text', item.text)
  setText('detail-meaning', item.meaning[base])
  setText('detail-note', item.note?.[base] || t(noteKey || 'titleNote'))
}
function translateShell() {
  document.documentElement.lang = base
  document.querySelectorAll('[data-t]').forEach(node => { node.textContent = t(node.dataset.t) })
  $('level').options[0].textContent = t('all')
  $('base').setAttribute('aria-label', t('base'))
  $('page-dots').setAttribute('aria-label', t('storyPages'))
  document.querySelector('.skip').textContent = t('skip')
}
function renderShelf() {
  $('shelf').replaceChildren()
  visibleEpisodes().forEach((e, i) => {
    const card = button('story-card', () => { openStory(e); $('book').focus({ preventScroll: true }) })
    card.setAttribute('aria-pressed', String(e.id === selected?.id))
    card.append(el('span', 'number', String(i + 1).padStart(2, '0')))
    const text = el('span'), title = el('span', 'title', e.title.text)
    title.lang = e.locale
    text.append(title, el('span', 'metadata', `${e.level} · ${t('worlds')[e.world]}`))
    const p = progress[e.id]
    if (Number.isInteger(p) && p > 0 && p < e.pages.length) text.append(el('span', 'metadata', t('resume')(p + 1)))
    card.append(text); $('shelf').append(card)
  })
}
function openStory(e, restart = false) {
  selected = e
  const saved = progress[e.id]
  pageIndex = !restart && Number.isInteger(saved) && saved >= 0 && saved < e.pages.length ? saved : 0
  detail = null; completed = false
  $('vocabulary').hidden = true
  $('vocab-toggle').setAttribute('aria-expanded', 'false')
  renderStory()
  setText('status', t('page')(pageIndex + 1, selected.pages.length))
}
function renderStory() {
  setText('story-meta', `${selected.level} / ${t('worlds')[selected.world]} / ${selected.locale}`)
  setText('story-title', selected.title.text); $('story-title').lang = selected.locale
  setText('story-meaning', selected.title.meaning[base])
  $('story-meaning').hidden = selected.title.meaning[base] === selected.title.text
  setText('focus', selected.learningFocus[base]); setText('fiction', selected.fictionNote[base])
  $('vocabulary').replaceChildren()
  selected.newWords.forEach(w => {
    const b = button('word', () => setDetail(w, 'wordNote'))
    const word = el('span', '', w.text); word.lang = selected.locale
    b.append(word, el('small', '', w.meaning[base])); $('vocabulary').append(b)
  })
  renderPage(); renderShelf()
}
function renderPage() {
  const page = selected.pages[pageIndex]
  progress[selected.id] = pageIndex; save()
  $('ending').hidden = !completed
  setText('scene-heading', t('worlds')[selected.world])
  setText('page-number', `${String(pageIndex + 1).padStart(2, '0')} / 06`)
  setText('page-title', page.title.text); $('page-title').lang = selected.locale
  $('page-title').onclick = () => setDetail(page.title)
  $('hotspots').replaceChildren(); $('lines').replaceChildren()
  page.hotspots.forEach((h, i) => {
    const b = button('hotspot', () => {
      setDetail(h, 'objectNote')
    })
    b.dataset.entry = h.id
    b.setAttribute('aria-pressed', String(detail?.item.id === h.id))
    b.append(el('span', '', String(i + 1)), el('span', '', h.label.text))
    b.lang = selected.locale
    // Coordinates are reserved for the final illustration; this study uses readable object chips.
    $('hotspots').append(b)
  })
  page.lines.forEach(line => {
    const b = button('line', () => {
      setDetail(line)
    })
    b.dataset.entry = line.id
    b.setAttribute('aria-pressed', String(detail?.item.id === line.id))
    b.append(el('span', 'speaker', line.speaker.toLowerCase() === 'narrator' ? t('narrator') : line.speaker))
    const target = el('span', 'target', line.text); target.lang = selected.locale; b.append(target)
    if ($('meanings').checked) b.append(el('span', 'meaning', line.meaning[base]))
    $('lines').append(b)
  })
  if (detail) setDetail(detail.item, detail.noteKey)
  else setDetail(page.lines[0])
  $('previous').disabled = pageIndex === 0
  $('next').disabled = completed
  setText('next', pageIndex === selected.pages.length - 1 ? t('finish') : t('next'))
  $('page-dots').replaceChildren()
  selected.pages.forEach((_, i) => {
    const b = button('', () => { goPage(i); $('page-title').focus({ preventScroll: true }) })
    b.setAttribute('aria-label', t('pageLabel')(i + 1))
    if (i === pageIndex) b.setAttribute('aria-current', 'page')
    $('page-dots').append(b)
  })
}
function goPage(n) {
  pageIndex = Math.max(0, Math.min(selected.pages.length - 1, n))
  detail = null; completed = false
  renderPage(); renderShelf(); setText('status', t('page')(pageIndex + 1, selected.pages.length))
}
$('base').addEventListener('change', e => {
  base = e.target.value; translateShell()
  renderStory()
  setText('status', completed ? t('ending') : t('page')(pageIndex + 1, selected.pages.length))
})
$('language').addEventListener('change', e => { locale = e.target.value; refreshLevels(); openStory(visibleEpisodes()[0]) })
$('level').addEventListener('change', e => { level = e.target.value; const visible = visibleEpisodes(); if (!visible.includes(selected)) openStory(visible[0]); else renderShelf() })
document.querySelectorAll('input[name=direction]').forEach(input => input.addEventListener('change', () => { document.body.dataset.direction = input.value }))
$('vocab-toggle').addEventListener('click', () => { $('vocabulary').hidden = !$('vocabulary').hidden; $('vocab-toggle').setAttribute('aria-expanded', String(!$('vocabulary').hidden)) })
$('meanings').addEventListener('change', () => renderPage())
$('resume').addEventListener('click', () => openStory(selected, true))
$('previous').addEventListener('click', () => goPage(pageIndex - 1))
$('next').addEventListener('click', () => {
  if (pageIndex < selected.pages.length - 1) goPage(pageIndex + 1)
  else { completed = true; $('ending').hidden = false; $('next').disabled = true; setText('status', t('ending')); $('next-story').focus({ preventScroll: true }) }
})
$('next-story').addEventListener('click', () => { const visible = visibleEpisodes(); openStory(visible[(visible.indexOf(selected) + 1) % visible.length]); $('book').focus({ preventScroll: true }) })
try {
  const collections = await Promise.all(['/english.json', '/spanish.json'].map(async name => {
    const response = await fetch(name); if (!response.ok) throw new Error('Draft not ready'); return response.json()
  }))
  episodes = collections.flatMap(c => c.episodes)
  if (!episodes.length) throw new Error('No episodes')
  translateShell(); refreshLevels(); openStory(visibleEpisodes()[0])
} catch {
  $('book').hidden = true
  for (const id of ['language', 'level', 'base']) $(id).disabled = true
  setText('status', t('error'))
}
