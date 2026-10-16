// Customer access uses a random 256-bit capability token, never enquiry IDs.
const origins = new Set(['https://cavehomesspain.com', 'https://www.cavehomesspain.com']);
export async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get('Origin');
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': origin && origins.has(origin) ? origin : 'https://cavehomesspain.com', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'content-type, apikey', 'Vary': 'Origin', 'X-Content-Type-Options': 'nosniff' };
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
  if (origin && !origins.has(origin)) return reply({ error: 'origin' }, 403);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return reply({ error: 'method' }, 405);
  try {
    if (Number(req.headers.get('content-length') || 0) > 2048) return reply({ error: 'request' }, 413);
    // Bound streaming bodies as well as clients that send Content-Length.
    const reader = req.body?.getReader();
    if (!reader) return reply({ error: 'request' }, 400);
    const chunks: Uint8Array[] = []; let length = 0;
    while (true) { const part = await reader.read(); if (part.done) break; length += part.value.length; if (length > 2048) { await reader.cancel(); return reply({ error: 'request' }, 413); } chunks.push(part.value); }
    const bytes = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const input = JSON.parse(new TextDecoder().decode(bytes));
    if (!input || typeof input.token !== 'string' || !/^[0-9a-f]{64}$/.test(input.token) || !['read','accept'].includes(input.action)) return reply({ error: 'unavailable' }, 400);
    if (input.action === 'accept' && (input.agreed !== true || typeof input.name !== 'string' || input.name.trim().length < 1 || input.name.trim().length > 120)) return reply({ error: 'name' }, 400);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input.token));
    const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
    const url = Deno.env.get('SUPABASE_URL'), key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) return reply({ error: 'temporary' }, 503);
    const endpoint = input.action === 'accept' ? 'accept_viewing_quote' : 'read_viewing_quote';
    const payload = input.action === 'accept' ? { p_token_hash: hash, p_name: input.name.trim() } : { p_token_hash: hash };
    const response = await fetch(url + '/rest/v1/rpc/' + endpoint, { method: 'POST', headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(10000) });
    if (!response.ok) return reply({ error: 'temporary' }, 503);
    const result = await response.json();
    return reply(result, result.error ? (result.error === 'name' ? 400 : 410) : 200);
  } catch (_) { return reply({ error: 'temporary' }, 503); }
}
Deno.serve(handler);
