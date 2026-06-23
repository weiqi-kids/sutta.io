# L3 Worker 部署手冊（WORKER_DEPLOY）

L3「對話研經 / 生成式重排」serverless 代理（Cloudflare Worker，程式碼於 `worker/`）的完整部署 runbook。
此 Worker 是 V2 功能，跨過 V1「零後端／零金鑰」紅線：Anthropic 金鑰**只存在 Worker secret**，絕不進前端、絕不進 repo。
前端只在 build 期設了 `PUBLIC_L3_API` 時才掛載 L3 UI；未部署前，站台維持純靜態零後端。

---

## 0. 目前進度（已由維運完成）

- ✅ Cloudflare 已登入（OAuth，帳號 `lightman.chang@gmail.com`）。
- ✅ 已建立速率限制用 KV namespace `RL`，**id = `e16719e4141642e0be4bfef34f0e1002`**
  （建於帳號 `Lightman.chang@gmail.com's Account`，Account ID `9d9e58b5e0d1657b8f74bd2cbfc91ee3`）。
- ✅ 該 id 已寫回 `worker/wrangler.jsonc` 的 `kv_namespaces[0].id`（取代原 placeholder）。
- ✅ `wrangler deploy --dry-run` 通過：程式碼可編譯（7.54 KiB / gzip 2.84 KiB），RL/ALLOWED_ORIGIN/MODEL/RATE_LIMIT_PER_MIN 四個綁定皆正確解析。

**尚未做（需人工，見 §3）**：設密鑰 `ANTHROPIC_API_KEY`、正式 `wrangler deploy`、設前端 `PUBLIC_L3_API` 並重建 site。

> ⚠️ 帳號注意：此 OAuth token 同時可存取兩個帳號（`Gcmgcm2021@…` 與 `Lightman.chang@…`）。
> 因有多帳號，wrangler 非互動模式需指定帳號，否則會報錯。所有指令請帶
> `CLOUDFLARE_ACCOUNT_ID=9d9e58b5e0d1657b8f74bd2cbfc91ee3`（即上面建 KV 的同一帳號），
> 或在 `wrangler.jsonc` 加 `"account_id": "9d9e58b5e0d1657b8f74bd2cbfc91ee3"`。

---

## 1. 你（使用者）必須提供的東西

| 項目 | 說明 |
|------|------|
| **Anthropic API key** | 於 <https://console.anthropic.com> 申請。這是**按量計費的 API key**，與 Claude.ai 訂閱不同。格式類似 `sk-ant-...`。**只貼進 `wrangler secret put` 的互動提示，不可寫進任何檔案。** |

其餘（Cloudflare 帳號、登入、KV、設定檔）皆已就緒。

---

## 2. 必要綁定 / 密鑰 / 變數（由 `worker/src/index.ts` 驗證）

`index.ts` 的 `Env` interface 實際引用：

| 名稱 | 種類 | 來源 | 現值 |
|------|------|------|------|
| `ANTHROPIC_API_KEY` | **secret** | `wrangler secret put`（**唯一需人工提供的密鑰**） | 未設 |
| `ALLOWED_ORIGIN` | var | `wrangler.jsonc` `vars` | `https://sutta.io` |
| `MODEL` | var | `wrangler.jsonc` `vars` | `claude-sonnet-4-6`（可改成你要用的 Anthropic 模型 id） |
| `RATE_LIMIT_PER_MIN` | var | `wrangler.jsonc` `vars` | `15`（每 IP 每分鐘） |
| `RL` | KV namespace 綁定 | `wrangler.jsonc` `kv_namespaces` | id `e16719e4141642e0be4bfef34f0e1002`（已填） |

程式行為：
- 缺 `ANTHROPIC_API_KEY` → 回 `500 Proxy 未設定金鑰`（所以未設密鑰前端點無法運作，不會洩漏未設定的服務）。
- `ALLOWED_ORIGIN` 非 `*` 且請求 `Origin` 不符 → `403 Forbidden origin`。
- 速率超限 → `429`（用 `RL` KV 以 `rl:<ip>:<minute-bucket>` 計數，TTL 120s）。

---

## 3. 部署步驟（人工）

所有指令於 repo 根目錄的 `worker/` 子目錄執行：

```bash
cd /root/sutta.io/worker
export CLOUDFLARE_ACCOUNT_ID=9d9e58b5e0d1657b8f74bd2cbfc91ee3   # 多帳號需指定

# （若尚未登入才需要）
# npx wrangler login

# 1. 設密鑰 —— 互動提示時貼上你的 Anthropic API key（不會回顯、不進 repo）
npx wrangler secret put ANTHROPIC_API_KEY

# 2. 正式部署
npx wrangler deploy
#   → 得到 Worker 網址，形如 https://sutta-l3-proxy.<subdomain>.workers.dev
```

KV 已建、wrangler.jsonc 已填好 id，故**不需再跑 `kv namespace create`**。

> 若想自訂網域或非 `*.workers.dev` 路由，於部署後在 Cloudflare Dashboard → Workers & Pages → 該 Worker → Settings → Domains & Routes 設定，並把該網域加進 `wrangler.jsonc` 的 `ALLOWED_ORIGIN`（或設成前端網域）。

---

## 4. 啟用前端 L3（設定 `PUBLIC_L3_API`）

前端讀法（已驗證）：
- `site/src/pages/read/[sutta].astro`、`site/src/pages/en/read/[sutta].astro`、`site/src/pages/search.astro`、`site/src/pages/en/search.astro` 皆讀
  `import.meta.env.PUBLIC_L3_API`（build 期環境變數）。設了才掛載研經頁「對話」側欄與搜尋頁「語意（生成式重排）」。
- CI：`.github/workflows/deploy.yml` 的 build 步驟已注入 `PUBLIC_L3_API: ${{ vars.PUBLIC_L3_API }}`。

正式（GitHub Pages 自動部署）做法：

1. GitHub repo → **Settings → Secrets and variables → Actions → Variables** 新增（不是 Secrets，這是公開值）：
   - Name：`PUBLIC_L3_API`
   - Value：上一步拿到的 Worker 網址，例如 `https://sutta-l3-proxy.<subdomain>.workers.dev`（結尾斜線會被程式 strip，有無皆可）。
2. 觸發 site 重建：push 到預設分支，或在 Actions 手動 re-run `deploy` workflow。
3. 部署完成後，研經頁與搜尋頁即出現 L3 UI。

本機驗證（可選）：

```bash
PUBLIC_L3_API="https://sutta-l3-proxy.<subdomain>.workers.dev" pnpm -C /root/sutta.io/site build
```

---

## 5. 端點契約（由 `worker/src/index.ts` 驗證）

所有端點皆為 `POST`，受 CORS（`ALLOWED_ORIGIN`）與速率限制（`RATE_LIMIT_PER_MIN`）保護。`OPTIONS` 回 preflight；其他方法回 `404`。

### `POST /chat`（L3 對話，串流）

Request body：
```json
{
  "context": {
    "suttaId": "mn10",
    "title": "念處經",
    "segments": [
      { "id": "mn10:1.1", "pali": "...", "vernacular": "..." }
    ]
  },
  "messages": [
    { "role": "user", "content": "..." }
  ]
}
```
- `segments` 最多取前 400 筆；`messages` 取最後 12 則。
- 缺 `context.segments` 或 `messages` → `400 缺少 context 或 messages`。
- 回應：`text/plain; charset=utf-8` 的**純文字串流**（Worker 把 Anthropic SSE 的 `text_delta` 抽出轉純文字）。
- 上游 Anthropic 失敗 → `502 上游錯誤 <status>`。

### `POST /rerank`（任意查詢生成式重排，非串流）

Request body：
```json
{
  "question": "四念處與五蓋的關係？",
  "candidates": [
    { "id": "mn10:2.1", "pali": "...", "vernacular": "..." }
  ]
}
```
- `candidates` 最多取前 20 筆。
- 缺 `question` 或 `candidates` → `400 缺少 question 或 candidates`。
- 回應：`application/json`，形如 `{"ranked":[{"segment_id":"...","reason_zh":"..."}]}`。

### 防護欄（系統提示內建，SPEC §4.4/§7）

只依提供段落作答、每論點附 `segment_id` 引用、不確定說「依提供的段落無法判定」、不裁決宗派、不捏造經號。

---

## 6. 冒煙測試（部署後）

把 `<WORKER_URL>` 換成你的 Worker 網址。

CORS / 來源檢查（帶錯誤 Origin 應回 `403`）：
```bash
curl -i -X POST "<WORKER_URL>/rerank" \
  -H "Origin: https://evil.example" \
  -H "Content-Type: application/json" \
  --data '{"question":"x","candidates":[{"id":"mn10:1.1","pali":"a"}]}'
# 期望：HTTP/2 403  Forbidden origin
```

正常 rerank（帶允許的 Origin）：
```bash
curl -s -X POST "<WORKER_URL>/rerank" \
  -H "Origin: https://sutta.io" \
  -H "Content-Type: application/json" \
  --data '{"question":"四念處的對象有哪些？","candidates":[
    {"id":"mn10:3.1","pali":"kāye kāyānupassī","vernacular":"於身觀身"},
    {"id":"mn10:4.1","pali":"vedanāsu vedanānupassī","vernacular":"於受觀受"}
  ]}'
# 期望：application/json，形如 {"ranked":[{"segment_id":"...","reason_zh":"..."}]}
```

chat 串流：
```bash
curl -N -X POST "<WORKER_URL>/chat" \
  -H "Origin: https://sutta.io" \
  -H "Content-Type: application/json" \
  --data '{"context":{"suttaId":"mn10","title":"念處經","segments":[
    {"id":"mn10:3.1","pali":"kāye kāyānupassī","vernacular":"於身觀身"}]},
    "messages":[{"role":"user","content":"這段在講什麼？"}]}'
# 期望：text/plain 串流，逐字輸出繁中回答（只依提供段落）
```

速率限制：對同一端點在一分鐘內連發超過 `RATE_LIMIT_PER_MIN`（預設 15）次，應開始回 `429 查詢過於頻繁，請稍候再試。`

未設密鑰時（即現在）任一 POST 會回 `500 Proxy 未設定金鑰` —— 設了 `ANTHROPIC_API_KEY` 後才會正常。

---

## 7. 維運速查

- 看即時 log：`cd /root/sutta.io/worker && CLOUDFLARE_ACCOUNT_ID=9d9e58b5e0d1657b8f74bd2cbfc91ee3 npx wrangler tail`
- 改速率/來源/模型：編 `worker/wrangler.jsonc` 的 `vars` 後 `npx wrangler deploy`。
- 換金鑰：重跑 `npx wrangler secret put ANTHROPIC_API_KEY`。
- 關閉前端 L3：移除 GitHub repo variable `PUBLIC_L3_API` 並重建 site（站台即回純靜態，不需動 Worker）。
