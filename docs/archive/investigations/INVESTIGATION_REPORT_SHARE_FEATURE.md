# Investigation Report: Share Feature Not Working

**Date:** 2026-04-06
**Symptom:** `resonanz.pro/v/lbk4famm` shows "Profile failed to load" and redirects to dashboard

---

## 1. Vercel Routing — Is the serverless function reachable?

### vercel.json (full contents)

```json
{
  "framework": "vite",
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/$1" },
    { "src": "/v/(.*)", "dest": "/api/v/$1" },
    { "handle": "filesystem" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

### Routing analysis

The routing logic is correct in theory:
1. `/v/lbk4famm` matches rule 2 → rewrites internally to `/api/v/lbk4famm`
2. `handle: filesystem` should find the serverless function at `api/v/[id].ts`
3. If not found → falls through to SPA fallback `/(.*) → /index.html`

### Live test results

| URL | HTTP Status | Content-Type | Response Body |
|-----|-------------|--------------|---------------|
| `/api/test` | 200 | application/json | `{"ok":true,"time":"2026-04-06T05:14:12.992Z","runtime":"edge"}` |
| `/api/v/lbk4famm` | 200 | text/html | **SPA index.html** (NOT the serverless function) |
| `/v/lbk4famm` | 200 | text/html | **SPA index.html** (NOT the serverless function) |

### VERDICT: THE SERVERLESS FUNCTION `api/v/[id].ts` IS NOT DEPLOYED

`/api/test` works → Vercel IS deploying serverless functions from the `api/` directory.
`/api/v/lbk4famm` returns SPA → The function at `api/v/[id].ts` is NOT in the build output.

The `handle: filesystem` check fails to find a function at `/api/v/lbk4famm`, so the SPA fallback serves `index.html`.

### Why the function isn't deployed (hypotheses, most likely first)

1. **Dynamic route `[id]` in a subdirectory may not be supported by the Vite framework preset.** The Vite preset may only auto-detect flat `api/*.ts` files, not `api/subdir/[param].ts`. This would explain why `api/test.ts` works but `api/v/[id].ts` doesn't.

2. **Build error during function compilation.** The function imports `@supabase/supabase-js` — if Vercel's function builder fails to resolve this import (unlikely since it's in `package.json`), the function silently wouldn't deploy.

3. **The legacy `routes` config may interfere with dynamic function routing.** Using `routes` (instead of the newer `rewrites`/`redirects` config) replaces Vercel's built-in routing entirely, which could affect how dynamic route functions are discovered.

**Action needed:** Check the Vercel deployment dashboard → Functions tab to see if `api/v/[id]` appears in the deployed functions list. Also check the build logs for any errors related to this file.

---

## 2. Serverless Function — api/v/[id].ts

### Full contents

```ts
// Vercel Serverless Function — Share page OG meta tag server
// GET /api/v/[id]
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const segments = url.pathname.split('/')
  const shareId = segments[segments.length - 1]

  if (!shareId) {
    return Response.redirect(`${url.origin}/`, 302)
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data, error } = await supabase.rpc('get_shared_word', { share_id: shareId })

    if (error || !data) {
      return Response.redirect(`${url.origin}/`, 302)
    }

    // ... builds HTML with OG tags, redirects browsers to /share/:id
    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (err) {
    return Response.redirect(`${url.origin}/`, 302)
  }
}
```

### Code review

- **Export convention:** `export async function GET()` — correct named export (matches memory note about Vite preset requiring named exports)
- **Env vars:** Falls back from `SUPABASE_URL` → `VITE_SUPABASE_URL` → `''`. Note: `VITE_` vars are build-time only in Vite; they won't be available at runtime in serverless. The function relies on `SUPABASE_URL` and `SUPABASE_ANON_KEY` being set in Vercel env vars.
- **RPC call:** `get_shared_word({ share_id: shareId })` — matches the migration function signature
- **On success:** Returns full HTML page with OG meta tags + meta-refresh redirect to `/share/:id`
- **On failure:** 302 redirect to `/` (the homepage)
- **Error handling concern:** The 302-to-homepage on error masks failures — there's no way to distinguish "function ran but Supabase failed" from "function not deployed" without server logs

### VERDICT: Code is correct, but function is NOT deployed (see Section 1)

---

## 3. React Router — /share/:id Route

### Route definition from App.tsx (lines 100-102, with auth context)

```tsx
function AppRoutes() {
  return (
    <Routes>
      {/* Fully public routes — no auth, no redirect */}
      <Route path="/share/:shareId" element={<SharePage />} />   {/* ← LINE 102 */}

      {/* Public routes */}
      <Route element={<PublicRoute />}>                           {/* ← Auth check */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
      </Route>

      {/* Protected routes with layout */}
      <Route element={<ProtectedRoute />}>                        {/* ← Auth required */}
        {/* ... dashboard, deck, study, etc. */}
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />    {/* ← Catch-all */}
    </Routes>
  )
}
```

### Auth wrapper chain

```
BrowserRouter
  └─ ThemeProvider
    └─ SkinProvider
      └─ ToastProvider
        └─ AuthProvider          ← Wraps ALL routes (runs useAuthState on mount)
          └─ AppRoutes
            ├─ /share/:shareId   ← OUTSIDE ProtectedRoute ✓
            ├─ PublicRoute (/)
            ├─ ProtectedRoute (/dashboard, etc.)
            └─ catch-all (*)
```

### VERDICT: Route definition is correct

`/share/:shareId` is defined at the TOP of the Routes list, OUTSIDE any auth guard. If the browser reaches `/share/lbk4famm`, SharePage will render without auth.

**However:** `AuthProvider` wraps ALL routes, so `useAuthState()` runs on every page load. For unauthenticated users, `onAuthStateChange` fires with `session=null`, sets `loading=false`, and no profile fetch occurs. This is harmless — it doesn't block SharePage.

### The actual failure path (why the user sees "Profile failed to load")

Since the serverless function is NOT deployed:

1. Browser requests `resonanz.pro/v/lbk4famm`
2. Vercel rewrites to `/api/v/lbk4famm` → function not found → SPA fallback serves `index.html`
3. React Router receives path `/v/lbk4famm`
4. **No route matches `/v/:anything`** — there is NO React route for `/v/`
5. Catch-all `*` fires → `<Navigate to="/" replace />`
6. `/` is wrapped by `PublicRoute`:
   - **If logged in:** redirects to `/dashboard` → Dashboard loads → shows "Profile failed to load" if profile query fails
   - **If not logged in:** shows LandingPage (NOT "Profile failed to load")
7. The user sees "Profile failed to load" because they're logged in and the Dashboard is rendering

---

## 4. SharePage.tsx

### Full contents

```tsx
import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export default function SharePage() {
  const { shareId } = useParams<{ shareId: string }>()
  const [data, setData] = useState<SharedWordData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!shareId) return
    supabase
      .rpc('get_shared_word', { share_id: shareId })
      .then(({ data: result, error }) => {
        if (error || !result) {
          setNotFound(true)
        } else {
          setData(result as SharedWordData)
        }
        setLoading(false)
      })
  }, [shareId])

  // ... renders video, word info, CTA button
}
```

### Auth dependency analysis

- **Imports:** `supabase` from `@/lib/supabase` (the anonymous browser client) — NO auth hooks
- **No `useAuth`** — does NOT use `useAuth()`, `useUser()`, `useSession()`, or `useProfile()`
- **RPC call:** `get_shared_word` is `security definer` in the migration — works with anon key
- **Self-contained:** Creates its own loading/error states independently

### VERDICT: SharePage has ZERO auth dependencies — it would work correctly IF the user ever reached it

The user never reaches SharePage because:
- The serverless function doesn't deploy → no redirect to `/share/:id`
- There is no `/v/:id` React route → the SPA catches `/v/lbk4famm` and redirects to `/`

---

## 5. Supabase RPC & Migration

### Migration file: `supabase/migrations/20260406210000_shared_words.sql`

- Creates `shared_words` table with columns: `id` (text PK), `word_id`, `user_id`, `view_count`, `created_at`
- Creates RLS policies (public read, auth insert, public update for view_count)
- Creates `get_shared_word(share_id text)` function with `security definer`
- The function joins `shared_words` → `words` → `decks` and returns full word data as JSON

### Cannot verify from here

- **Was the migration actually run?** Need to check Supabase dashboard or run `supabase migration list`
- **Does the `shared_words` table exist?** Need SQL editor access
- **Does a row with id `lbk4famm` exist?** Need to query `select * from shared_words where id = 'lbk4famm'`

### VERDICT: Migration looks correct, but unverifiable whether it was applied

---

## 6. shareWord.ts — Link Creation

```ts
// Creates share links in the format: {origin}/v/{nanoid}
export async function getOrCreateShareLink(wordId: string): Promise<string | null> {
  // 1. Gets current user
  // 2. Checks for existing share link (reuses)
  // 3. Creates new one with nanoid(8) if none exists
  // 4. Returns URL like: https://resonanz.pro/v/lbk4famm
}
```

The share link format is `/v/{id}` — this matches the vercel.json rewrite rule. The creation flow appears correct.

---

## Root Cause Summary

```
PRIMARY BUG: api/v/[id].ts serverless function is NOT deployed on Vercel
              ↓
              /v/lbk4famm → SPA fallback → /index.html
              ↓
              React Router: no /v/ route → catch-all → redirect to /
              ↓
              Logged in: / → /dashboard → "Profile failed to load"
              Not logged in: / → LandingPage (no error, just wrong page)
              ↓
SECONDARY:    No OG meta tags served → no WhatsApp/social preview
```

### Why it's not deployed

The function file exists at `api/v/[id].ts`, was committed in `7c8912d`, and is on `origin/main`. But the Vercel build is NOT including it as a deployed function. Most likely cause: **Vercel's Vite framework preset may not support dynamic route functions (`[id]`) in subdirectories of `api/`.**

Evidence: `api/test.ts` (flat file, no dynamic segment) → works. `api/v/[id].ts` (subdirectory, dynamic segment) → not deployed.

---

## Recommended Fixes (priority order)

### Fix 1: Move function to flat path (quick fix)
Rename `api/v/[id].ts` → `api/share.ts` and use a query parameter:
- URL: `/api/share?id=lbk4famm`
- Update vercel.json: `{ "src": "/v/(.*)", "dest": "/api/share?id=$1" }`
- This avoids the dynamic route subdirectory issue entirely

### Fix 2: Add `/v/:id` React route as fallback
Add a client-side route for `/v/:id` that redirects to `/share/:id`:
```tsx
<Route path="/v/:shareId" element={<Navigate to={`/share/${shareId}`} replace />} />
```
Or better: make `/v/:id` render SharePage directly (eliminates dependency on the serverless function for non-social-crawler use):
```tsx
<Route path="/v/:shareId" element={<SharePage />} />
```
This fixes the user-facing bug even if the serverless function isn't deployed. Social previews still need the serverless function.

### Fix 3: Switch from legacy `routes` to `rewrites`
The `routes` config is legacy and may cause function detection issues. Migrate to:
```json
{
  "framework": "vite",
  "rewrites": [
    { "source": "/v/:id", "destination": "/api/share?id=:id" }
  ]
}
```

### Fix 4: Verify Supabase migration
Run the migration if it hasn't been applied:
```bash
supabase db push
# or manually run 20260406210000_shared_words.sql in the SQL editor
```

### Fix 5: Verify Vercel env vars
Ensure `SUPABASE_URL` and `SUPABASE_ANON_KEY` (non-VITE_ prefixed) are set in Vercel project settings for the Production environment.
