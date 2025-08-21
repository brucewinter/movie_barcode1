// Cloudflare Worker: UPC proxy with permissive CORS
// Usage: GET https://your-worker.your-subdomain.workers.dev/?upc=883929822355
// Returns: { ok: true, title?: string, items?: any[], source: 'upcitemdb' }
//
// Deploy (quick):
// 1) Install Wrangler: npm i -g wrangler
// 2) wrangler init upc-proxy --yes (or add this file to an existing worker)
// 3) Replace the default src/index.ts with this file's contents
// 4) wrangler dev   (test locally)
// 5) wrangler deploy
//
// UPCItemDB trial endpoint has rate limits. For production, consider an API plan or
// swapping to another UPC source. This proxy only forwards the title/items and sets CORS headers.

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    if (url.pathname !== '/' && url.pathname !== '/upc') {
      return json({ ok: false, error: 'Not Found' }, 404);
    }

    const upc = url.searchParams.get('upc');
    if (!upc) return json({ ok: false, error: 'Missing upc param' }, 400);

    try {
      const upstream = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(upc)}`);
      if (!upstream.ok) {
        return json({ ok: false, error: `Upstream error: ${upstream.status}` }, upstream.status);
      }
      const data = await upstream.json();
      const title = data?.items?.[0]?.title ?? null;
      return json({ ok: true, title, items: data?.items ?? [], source: 'upcitemdb' });
    } catch (e: any) {
      return json({ ok: false, error: e?.message || 'Fetch failed' }, 500);
    }
  },
} satisfies ExportedHandler;

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Cache-Control': 'no-store',
};

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}
