# get-favicon

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)

[中文文档](README_CN.md)

A favicon proxy service built on Cloudflare Workers. Fetch any website's favicon by domain name.

## API

```
GET https://get-favicon.lingjistudio.com/{domain}
GET https://get-favicon.lingjistudio.com/?domain={domain}
```

### Examples

```bash
# GitHub
curl https://get-favicon.lingjistudio.com/github.com -o github.ico

# Google
curl https://get-favicon.lingjistudio.com/google.com -o google.ico

# OpenAI
curl https://get-favicon.lingjistudio.com/openai.com -o openai.ico
```

Use in HTML:

| | Domain | Result |
|---|---|---|
| GitHub | `github.com` | <img src="https://get-favicon.lingjistudio.com/github.com" width="16" height="16" /> |
| Google | `google.com` | <img src="https://get-favicon.lingjistudio.com/google.com" width="16" height="16" /> |
| OpenAI | `openai.com` | <img src="https://get-favicon.lingjistudio.com/openai.com" width="16" height="16" /> |

```html
<img src="https://get-favicon.lingjistudio.com/github.com" alt="GitHub" />
<img src="https://get-favicon.lingjistudio.com/google.com" alt="Google" />
<img src="https://get-favicon.lingjistudio.com/openai.com" alt="OpenAI" />
```

### Responses

- **Success**: Returns favicon image (ICO/PNG/SVG), `Cache-Control: public, max-age=604800`
- **Not found**: Returns default placeholder SVG, `Cache-Control: public, max-age=3600`
- **Missing domain**: `400 {"error":"Missing or invalid domain parameter"}`
- **Method not allowed**: `405 {"error":"Method Not Allowed"}`

## How It Works

```
Request → Cache API hit? → Return cached
        → Fetch https://{domain}/favicon.ico → Success? → Proxy + cache
        → Fetch Google S2 fallback → Success? → Proxy + cache
        → Return default placeholder (short TTL)
```

## Development

```bash
npm install
npm run dev        # Local development
npm run deploy     # Deploy to Cloudflare
npm run typecheck  # Type check
```

## Contributing

Contributions are welcome! Please feel free to submit a [Pull Request](https://github.com/lingjistudio/get-favicon/pulls). For major changes, please open an [issue](https://github.com/lingjistudio/get-favicon/issues) first to discuss what you would like to change.

## License

[MIT](LICENSE)
