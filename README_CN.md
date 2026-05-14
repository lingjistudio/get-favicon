# get-favicon

[English](README.md)

基于 Cloudflare Worker 的 Favicon 代理服务，根据域名获取对应网站的 favicon 图标。

## 接口

```
GET https://get-favicon.lingjistudio.com/{domain}
GET https://get-favicon.lingjistudio.com/?domain={domain}
```

### 示例

```bash
# GitHub
curl https://get-favicon.lingjistudio.com/github.com -o github.ico

# Google
curl https://get-favicon.lingjistudio.com/google.com -o google.ico

# OpenAI
curl https://get-favicon.lingjistudio.com/openai.com -o openai.ico
```

在 HTML 中使用：

| | 域名 | 效果 |
|---|---|---|
| GitHub | `github.com` | <img src="https://get-favicon.lingjistudio.com/github.com" width="16" height="16" /> |
| Google | `google.com` | <img src="https://get-favicon.lingjistudio.com/google.com" width="16" height="16" /> |
| OpenAI | `openai.com` | <img src="https://get-favicon.lingjistudio.com/openai.com" width="16" height="16" /> |

```html
<img src="https://get-favicon.lingjistudio.com/github.com" alt="GitHub" />
<img src="https://get-favicon.lingjistudio.com/google.com" alt="Google" />
<img src="https://get-favicon.lingjistudio.com/openai.com" alt="OpenAI" />
```

### 响应

- **成功**：返回 favicon 图片（ICO/PNG/SVG），`Cache-Control: public, max-age=604800`
- **未找到**：返回默认占位 SVG 图标，`Cache-Control: public, max-age=3600`
- **缺少域名**：`400 {"error":"Missing or invalid domain parameter"}`
- **方法不允许**：`405 {"error":"Method Not Allowed"}`

## 工作原理

```
请求 → Cache API 命中？→ 直接返回
     → 获取 https://{domain}/favicon.ico → 成功？→ 透传 + 缓存
     → 获取 Google S2 兜底 → 成功？→ 透传 + 缓存
     → 返回默认占位图标（短缓存）
```

## 开发

```bash
npm install
npm run dev        # 本地开发
npm run deploy     # 部署
npm run typecheck  # 类型检查
```

## 许可证

[MIT](LICENSE)
