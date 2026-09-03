// Vercel Serverless Function — Share page OG meta tag server
// GET /api/share?id=<shareId>
// Returns HTML with Open Graph tags for link previews (WhatsApp, iMessage, etc.)
// Social crawlers read the OG tags; browsers get redirected to /share/:id (SPA route)

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''

// Share ids are 12 hex chars (gen_random_bytes); accept a slightly wider shape
// so older ids keep working, but never let anything else reach the page.
const SHARE_ID_PATTERN = /^[A-Za-z0-9_-]{6,64}$/

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
  const shareId = url.searchParams.get('id') ?? ''

  if (!SHARE_ID_PATTERN.test(shareId)) {
    return Response.redirect(`${url.origin}/`, 302)
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })

    const { data, error } = await supabase.rpc('get_shared_word', { share_id: shareId })

    if (error || !data) {
      return Response.redirect(`${url.origin}/`, 302)
    }

    const word = data as SharedWordData

    const title = word.article
      ? `${word.article} ${word.word} — ${word.translation || word.word}`
      : `${word.word}${word.translation ? ` — ${word.translation}` : ''}`

    const description = word.mnemonic
      || `Learn "${word.word}" in ${word.target_language} with Lingwave`

    const thumbnail = word.thumbnail_url || ''
    const encodedId = encodeURIComponent(shareId)
    const pageUrl = `${url.origin}/v/${encodedId}`
    const spaUrl = `${url.origin}/share/${encodedId}`

    // Count the view before responding: a fire-and-forget promise may not
    // complete once the function freezes. Never fail the page over it.
    const { error: viewError } = await supabase.rpc('increment_shared_word_view', { p_share_id: shareId })
    if (viewError) {
      console.warn('[share] view increment failed:', viewError.message)
    }

    // No inline script: the meta refresh already redirects browsers, and the
    // page then lives cleanly under a script-src 'self' CSP.
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} | Lingwave</title>

  <!-- Open Graph -->
  <meta property="og:type" content="video.other" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(pageUrl)}" />
  <meta property="og:site_name" content="Lingwave" />
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
  <p>Loading… <a href="${escapeHtml(spaUrl)}">Open in Lingwave</a></p>
</body>
</html>`

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=600',
        'X-Content-Type-Options': 'nosniff',
      },
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
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
