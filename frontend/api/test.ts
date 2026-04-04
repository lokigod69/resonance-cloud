export default function handler(req: Request): Response {
  console.log('[test] Function invoked', req.method)
  return new Response(JSON.stringify({ ok: true, time: new Date().toISOString() }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
