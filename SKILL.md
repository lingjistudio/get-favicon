---
name: get-favicon
description: >
  Use when a project needs to display website favicon icons — fetching favicons by domain name
  for link directories, bookmark managers, URL previews, site cards, nav bars, or any UI that
  shows third-party website icons. Covers the get-favicon proxy API, integration patterns for
  HTML/React/Vue, fallback strategies, caching behavior, and self-hosting on Cloudflare Workers.
---

# get-favicon

A lightweight favicon proxy API. Pass a domain name, get back the site's icon.

## When to Use

- Building a link directory, bookmark manager, or URL preview
- Displaying site icons in nav bars, cards, or tables
- Need favicons without CORS issues or complex fetching logic
- Want to self-host your own favicon proxy on Cloudflare Workers

## API

Base URL: `https://get-favicon.lingjistudio.com`

```
GET /{domain}
GET /?domain={domain}
```

Both styles are equivalent. Path parameter is matched first.

## Integration Patterns

### HTML / Vanilla JS

```html
<img src="https://get-favicon.lingjistudio.com/github.com"
     alt="GitHub"
     width="16" height="16" />
```

### React

```tsx
function FaviconImage({ domain, size = 16 }: { domain: string; size?: number }) {
  return (
    <img
      src={`https://get-favicon.lingjistudio.com/${domain}`}
      alt={domain}
      width={size}
      height={size}
    />
  );
}
```

### Vue

```vue
<template>
  <img
    :src="`https://get-favicon.lingjistudio.com/${domain}`"
    :alt="domain"
    width="16"
    height="16"
  />
</template>
```

### Server-Side (fetch / curl)

```bash
curl -o github.ico https://get-favicon.lingjistudio.com/github.com
```

```typescript
const response = await fetch("https://get-favicon.lingjistudio.com/github.com");
const favicon = await response.arrayBuffer();
```

## Response Behavior

| Condition | HTTP Status | Content-Type | Cache TTL |
|-----------|-------------|--------------|-----------|
| Favicon found (origin) | 200 | Original (ICO/PNG/SVG) | 7 days |
| Favicon found (Google S2 fallback) | 200 | image/png | 7 days |
| Domain not found / no favicon | 200 | image/svg+xml (placeholder) | 1 hour |
| Missing domain parameter | 400 | application/json | — |
| Non-GET method | 405 | application/json | — |

All responses include `Access-Control-Allow-Origin: *` (CORS-safe for browser use).

## Fallback Strategy

```
Origin /favicon.ico → Google S2 → Default placeholder SVG
```

Every request returns a valid image. No need for client-side error handling beyond optional display adjustments.

## Self-Hosting

Deploy your own instance on Cloudflare Workers:

```bash
git clone https://github.com/lingjistudio/get-favicon.git
cd get-favicon
npm install
npx wrangler deploy
```

Requires a Cloudflare account (free tier works). Customize the domain in `wrangler.jsonc`.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `http://` instead of `https://` | Always use `https://get-favicon.lingjistudio.com` |
| Passing full URL (`https://github.com`) | Pass domain only: `github.com` |
| Adding trailing slash (`/github.com/`) | Remove trailing slash: `/github.com` |
| Handling 404 for missing favicons | Every request returns 200 with an image — no error handling needed |
| Ignoring cache headers | Respect `Cache-Control` to avoid unnecessary requests |
