export function GET(): Response {
  return new Response(JSON.stringify({ ok: true, time: new Date().toISOString(), runtime: 'edge' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
