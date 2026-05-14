const DOMAIN_RE = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)*[a-z]{2,}$/i;

const DEFAULT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#ccc"/><text x="16" y="22" font-size="18" text-anchor="middle" fill="#999">?</text></svg>`;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
};

const CACHE_TTL_SUCCESS = 604800; // 7 天
const CACHE_TTL_FAILURE = 3600;   // 1 小时

const UA_HTML = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36';
const UA_ICON = 'Mozilla/5.0 (compatible; FaviconProxy/1.0)';
const MAX_ICON_ATTEMPTS = 5;

interface FaviconLink {
  href: string;
  type?: string;
  sizes?: string;
  rel: string;
}

interface FaviconResult {
  data: ArrayBuffer;
  contentType: string;
}

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

    // 四链降级：HTML 解析 → /favicon.ico → Google S2 → 占位符
    const result =
      await fetchFromHTML(domain) ??
      await fetchFromOrigin(domain) ??
      await fetchFromGoogleS2(domain);

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

// --- 工具函数 ---

function resolveUrl(href: string, domain: string): string {
  if (href.startsWith('//')) return `https:${href}`;
  if (href.startsWith('https://') || href.startsWith('http://')) return href;
  return new URL(href, `https://${domain}/`).href;
}

function rankIcons(links: FaviconLink[]): FaviconLink[] {
  return [...links].sort((a, b) => iconScore(b) - iconScore(a));
}

function iconScore(link: FaviconLink): number {
  const href = link.href.toLowerCase();
  const type = link.type?.toLowerCase() ?? '';

  if (type.includes('svg') || href.endsWith('.svg')) return 100;
  if (link.rel.includes('apple-touch')) return 90;
  if (type.includes('png') || href.endsWith('.png')) {
    // 有尺寸声明的取最大尺寸
    const sizeMatch = link.sizes?.match(/(\d+)/);
    const size = sizeMatch ? parseInt(sizeMatch[1]) : 0;
    return 70 + Math.min(size, 30); // 70-100，尺寸越大分越高
  }
  return 50; // ICO 或未知格式
}

// --- HTML 解析 ---

// 标准 favicon rel 值
const FAVICON_RELS = ['icon', 'shortcut icon', 'apple-touch-icon', 'apple-touch-icon-precomposed', 'alternate icon'];

class FaviconLinkHandler {
  links: FaviconLink[] = [];

  element(element: Element) {
    const rel = (element.getAttribute('rel') ?? '').toLowerCase();
    if (!FAVICON_RELS.some(r => rel === r)) return;
    const href = element.getAttribute('href');
    if (!href) return;
    this.links.push({
      href,
      type: element.getAttribute('type') ?? undefined,
      sizes: element.getAttribute('sizes') ?? undefined,
      rel,
    });
  }
}

// --- 获取源 ---

async function fetchFromHTML(domain: string): Promise<FaviconResult | null> {
  try {
    const res = await fetch(`https://${domain}/`, {
      headers: { 'User-Agent': UA_HTML },
      redirect: 'follow',
    });
    if (!res.ok) return null;

    const handler = new FaviconLinkHandler();
    const transformed = new HTMLRewriter().on('link', handler).transform(res);
    await transformed.text();

    const ranked = rankIcons(handler.links);
    const attempts = ranked.slice(0, MAX_ICON_ATTEMPTS);
    for (const link of attempts) {
      const iconUrl = resolveUrl(link.href, domain);
      const result = await fetchIcon(iconUrl);
      if (result) return result;
    }

    return null;
  } catch {
    return null;
  }
}

async function fetchFromOrigin(domain: string): Promise<FaviconResult | null> {
  try {
    const res = await fetch(`https://${domain}/favicon.ico`, {
      headers: { 'User-Agent': UA_ICON },
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

async function fetchFromGoogleS2(domain: string): Promise<FaviconResult | null> {
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

async function fetchIcon(url: string): Promise<FaviconResult | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA_ICON },
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const data = await res.arrayBuffer();
    if (data.byteLength === 0) return null;
    const contentType = res.headers.get('content-type') || guessContentType(url);
    return { data, contentType };
  } catch {
    return null;
  }
}

function guessContentType(url: string): string {
  const path = url.split('?')[0].toLowerCase();
  if (path.endsWith('.svg')) return 'image/svg+xml';
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.ico')) return 'image/x-icon';
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg';
  if (path.endsWith('.webp')) return 'image/webp';
  return 'image/x-icon';
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
