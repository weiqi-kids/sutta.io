# L3 Proxy — 對話研經 / 生成式重排 serverless 代理（G-3）

跨過 V1「零後端/零金鑰」紅線的 **V2 功能**。金鑰只在 Worker secret，**絕不進前端/repo**。
前端只在設了 `PUBLIC_L3_API` 時才啟用 L3；未部署前，站維持純靜態零後端。

## 部署步驟

需要：**Cloudflare 帳號** + **Anthropic API key**（console.anthropic.com 申請，與 Claude 訂閱不同、按量計費）。

```bash
cd worker
pnpm dlx wrangler login                       # 登入 Cloudflare

# 1. 建速率限制用 KV，把回傳的 id 填回 wrangler.jsonc 的 kv_namespaces[0].id
pnpm dlx wrangler kv namespace create RL

# 2. 設密鑰（不進 repo）
pnpm dlx wrangler secret put ANTHROPIC_API_KEY   # 貼上你的 Anthropic API key

# 3. 視需要改 wrangler.jsonc 的 ALLOWED_ORIGIN（你的網域）、MODEL、RATE_LIMIT_PER_MIN

# 4. 部署
pnpm dlx wrangler deploy                          # 得到 https://sutta-l3-proxy.<account>.workers.dev
```

## 啟用前端 L3

把 Worker 網址設給前端（build 期環境變數），再重建部署 site：

```bash
PUBLIC_L3_API="https://sutta-l3-proxy.<account>.workers.dev" pnpm -C site build
```

或在 GitHub Actions 的 build 步驟加 `env: PUBLIC_L3_API: ${{ vars.PUBLIC_L3_API }}`（於 repo variables 設定）。
設了才會出現研經頁「對話」側欄與搜尋頁「語意（生成式重排）」。

## 端點

- `POST /chat`：L3 對話。body `{context:{suttaId,title,segments:[{id,pali,vernacular}]}, messages:[{role,content}]}` → 純文字串流。
- `POST /rerank`：任意查詢生成式重排。body `{question, candidates:[{id,pali,vernacular}]}` → `{ranked:[{segment_id,reason_zh}]}`。

## 防護欄（系統提示內建）

只依提供段落作答、附 segment_id 引用、不確定說不知道、不裁決宗派、不捏經號（SPEC §4.4/§7）。
速率限制：每 IP 每分鐘 `RATE_LIMIT_PER_MIN`（KV 計數）。來源限 `ALLOWED_ORIGIN`。
