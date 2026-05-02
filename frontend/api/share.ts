// Vercel Serverless Function — Share page OG meta tag server
// GET /api/share?id=<shareId>
// Returns HTML with Open Graph tags for link previews (WhatsApp, iMessage, etc.)
// Social crawlers read the OG tags; browsers get redirected to /share/:id (SPA route)

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''

interface SharedWordData {
  share_id: string
  word: string
  translation: string | null
  mnemonic: string | null
  pos: string | null
  article: string | null
  video_url: string | null
  thumbnail_url: string | null
  target_language: string
  view_count: number
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const shareId = url.searchParams.get('id')

  if (!shareId) {
    return Response.redirect(`${url.origin}/`, 302)
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const { data, error } = await supabase.rpc('get_shared_word', { share_id: shareId })

    if (error || !data) {
      return Response.redirect(`${url.origin}/`, 302)
    }

    const word = data as SharedWordData

    const title = word.article
      ? `${word.article} ${word.word} — ${word.translation || word.word}`
      : `${word.word}${word.translation ? ` — ${word.translation}` : ''}`

    const description = word.mnemonic
      || `Learn "${word.word}" in ${word.target_language} with Resonance`

    const thumbnail = word.thumbnail_url || ''
    const pageUrl = `${url.origin}/v/${shareId}`
    const spaUrl = `${url.origin}/share/${shareId}`

    // Increment view count atomically. Fire-and-forget so crawlers still get OG tags.
    supabase
      .rpc('increment_shared_word_view', { p_share_id: shareId })
      .then(() => {})

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} | Resonance</title>

  <!-- Open Graph -->
  <meta property="og:type" content="video.other" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(pageUrl)}" />
  <meta property="og:site_name" content="Resonance" />
  ${thumbnail ? `<meta property="og:image" content="${escapeHtml(thumbnail)}" />
  <meta property="og:image:width" content="1280" />
  <meta property="og:image:height" content="720" />` : ''}
  ${word.video_url ? `<meta property="og:video" content="${escapeHtml(word.video_url)}" />
  <meta property="og:video:type" content="video/mp4" />` : ''}

  <!-- Twitter Card -->
  <meta name="twitter:card" content="${thumbnail ? 'summary_large_image' : 'summary'}" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  ${thumbnail ? `<meta name="twitter:image" content="${escapeHtml(thumbnail)}" />` : ''}

  <!-- Redirect browsers to SPA route (crawlers don't follow this) -->
  <meta http-equiv="refresh" content="0;url=${escapeHtml(spaUrl)}" />
</head>
<body>
  <p>Loading...</p>
  <script>window.location.replace(${JSON.stringify(spaUrl)})</script>
</body>
</html>`

    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (err) {
    console.error('[share] Error:', err)
    return Response.redirect(`${url.origin}/`, 302)
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
