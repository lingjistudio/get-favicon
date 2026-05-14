const DOMAIN_RE = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)*[a-z]{2,}$/i;

const DEFAULT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#ccc"/><text x="16" y="22" font-size="18" text-anchor="middle" fill="#999">?</text></svg>`;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
};

const CACHE_TTL_SUCCESS = 604800; // 7 天
const CACHE_TTL_FAILURE = 3600;   // 1 小时

export default {
  async fetch(request: Request, _env: unknown, ctx: ExecutionContext): Promise<Response> {
    // OPTIONS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: CORS_HEADERS });
    }

    // 仅允许 GET
    if (request.method !== 'GET') {
      return json({ error: 'Method Not Allowed' }, 405);
    }

    const url = new URL(request.url);
    const domain = extractDomain(url);

    if (!domain) {
      return Response.redirect('https://github.com/lingjistudio/get-favicon', 302);
    }

    // 查缓存
    const cacheKey = new Request(`https://favicon-cache/${domain}`, { method: 'GET' });
    const cache = caches.default;
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    // 三链降级
    const result = await fetchFromOrigin(domain) ?? await fetchFromGoogleS2(domain);

    const response = result
      ? buildResponse(result.data, result.contentType, CACHE_TTL_SUCCESS)
      : buildResponse(DEFAULT_SVG, 'image/svg+xml', CACHE_TTL_FAILURE);

    // 后台写入缓存
    const resClone = response.clone();
    ctx.waitUntil(cache.put(cacheKey, resClone));

    return response;
  },
} satisfies ExportedHandler;

// --- 路由 ---

function extractDomain(url: URL): string | null {
  // 路径参数: GET /{domain}
  const pathDomain = url.pathname.slice(1);
  if (pathDomain && isValidDomain(pathDomain)) return pathDomain;

  // 查询参数: GET /?domain={domain}
  const queryDomain = url.searchParams.get('domain');
  if (queryDomain && isValidDomain(queryDomain)) return queryDomain;

  return null;
}

function isValidDomain(domain: string): boolean {
  return DOMAIN_RE.test(domain);
}

// --- 获取源 ---

async function fetchFromOrigin(domain: string): Promise<{ data: ArrayBuffer; contentType: string } | null> {
  try {
    const res = await fetch(`https://${domain}/favicon.ico`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FaviconProxy/1.0)' },
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const data = await res.arrayBuffer();
    if (data.byteLength === 0) return null;
    const contentType = res.headers.get('content-type') || 'image/x-icon';
    return { data, contentType };
  } catch {
    return null;
  }
}

async function fetchFromGoogleS2(domain: string): Promise<{ data: ArrayBuffer; contentType: string } | null> {
  try {
    const res = await fetch(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`, {
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const data = await res.arrayBuffer();
    if (data.byteLength === 0) return null;
    return { data, contentType: 'image/png' };
  } catch {
    return null;
  }
}

// --- 响应构建 ---

function buildResponse(body: string | ArrayBuffer, contentType: string, maxAge: number): Response {
  const headers: Record<string, string> = {
    ...CORS_HEADERS,
    'Content-Type': contentType,
    'Cache-Control': `public, max-age=${maxAge}`,
  };
  return new Response(body, { headers });
}

function json(obj: unknown, status: number): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

