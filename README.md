# get-favicon

基于 Cloudflare Worker 的 Favicon 代理服务，根据域名获取对应网站的 favicon 图标。

## 接口

```
GET https://get-favicon.lingjistudio.com/{domain}
GET https://get-favicon.lingjistudio.com/?domain={domain}
```

### 示例

```bash
# 路径参数
curl https://get-favicon.lingjistudio.com/github.com

# 查询参数
curl https://get-favicon.lingjistudio.com/?domain=cloudflare.com
```

### 响应

- 成功：返回 favicon 图片（ICO/PNG/SVG），`Cache-Control: public, max-age=604800`
- 失败：返回默认占位 SVG 图标，`Cache-Control: public, max-age=3600`
- 缺少域名参数：`400 {"error":"Missing or invalid domain parameter"}`
- 非 GET 请求：`405 {"error":"Method Not Allowed"}`

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
