# BUILD_SPEC.md — 建置 / 部署 / repo 結構

> 對應 BACKLOG G 區。把「怎麼蓋起來」釘成規格。
> **分界**:🔒=契約(實作者須遵守)；🔧=建議預設(可換)。

---

## 0. 兩個世界與交接面（最重要的契約）

```
[ build 期 ]  資料管線 + L2 生成        ── 產出 ──>  [ 靜態產物 ]  ──>  [ runtime ] 靜態站
  (有金鑰、有重模型,只在 CI/本機跑)         JSON/索引/嵌入/靜態結果        (純前端,零後端,V1)
```

🔒 **交接面 = 靜態產物**(每經 JSON + 索引 + 嵌入 + 策展結果)。管線與前端只透過這些檔溝通,彼此可獨立替換。
🔒 V1 **runtime 無伺服器、無 API 金鑰、無託管 LLM**。任何需要 runtime 模型的功能(對話、任意查詢生成式重排)屬 V2。
🔒 金鑰只存在於 build 環境,**絕不進入靜態產物**。

---

## 1. 推薦技術棧（🔧 可換,但交接面契約不變）

| 層 | 推薦 | 理由 | 可換? |
|---|---|---|---|
| 靜態站 | **Astro + React islands** | 內容頁零 JS,研經頁/搜尋用 island 才載互動 | 🔧 可換 Vite+React、SvelteKit static… |
| 樣式 | 直接用 `design/design-tokens.css` + 原生 CSS(或 Tailwind 接 token) | token 已備 | 🔧 |
| 資料管線 | **Python**(dpd-db 是 SQLite;資料清理) | DPD/CBETA 處理、嵌入皆 Python 生態成熟 | 🔧 可換 Node |
| 嵌入(build) | sentence-transformers,`intfloat/multilingual-e5-small`(**MIT**) | 與前端同模型 → 向量相容 | 🔧 但須與前端同模型 |
| 嵌入(client) | transformers.js + 同一 e5-small | 離線、即時 | 🔒 須與 build 同模型同維度 |
| L2 生成 | build 期腳本呼叫 Claude(**Claude Code/CLI** 或 API) | 與 L2_GENERATION 一致 | 🔧 |
| 部署 | **GitHub Pages + GitHub Actions** | 已定靜態托管 | 🔧 可換 Cloudflare Pages… |

> 🔒 不論換什麼:前端與管線**不可**在 V1 引入 runtime 後端;嵌入模型 build 與 client **必須同一個**(否則向量不相容)。

---

## 2. Repo 結構（🔧 建議）

```
tipitaka-lens/
├── pipeline/            Python:擷取→DPD join→消歧→對照→索引→嵌入(P1–P9)
│   ├── extract/  dpd/  align/  index/  embed/
│   └── manifest.py      鎖版輸出(A-5)
├── generation/          L2 生成腳本(T1–T5,呼叫 Claude;build 期)
│   └── review/          draft→approved 校稿工具(本地,非公開)
├── data/                ⚙️ build 產物(每經 JSON/索引/嵌入/策展結果);git-ignore 或 LFS
├── content/             人工備料:策展問題、教義詞彙表(F-2)、署名
├── site/                Astro 前端(讀 data/ 產物)
│   ├── src/pages/  src/components/  src/lib/(嵌入查詢/搜尋)
│   └── public/models/   client 嵌入模型(離線)
├── contracts/           ← 既有 study_page_types.ts(前端與管線共用型別)
├── design/              ← 既有 design-tokens.css
├── fixtures/            ← 既有 mn1.json(前端可先用它跑)
└── docs/                ← 既有規格
```

🔒 `data/` 是產物,不是真相來源;真相是 `pipeline/` 的輸入(鎖版來源)+ 程式。任何人重跑管線都應得到相同 `data/`(可重現,§5)。

---

## 3. Build 流程（端到端）

```
1. pipeline 跑(Python)          → data/{sutta}.json, indexes, embeddings, manifest
2. generation 跑(呼叫 Claude)   → data/ 內 L2 內容(draft) → 校稿 → approved 固化
3. site 建置(Astro)            → 讀 data/ → 靜態 HTML/JS/CSS
4. 部署(Actions → Pages)
```

🔒 步驟 1–2 在 build 期、需金鑰;步驟 3–4 純靜態。
🔧 小量更新可只重跑受影響的經。

---

## 4. 環境與祕密

- `.env`(本機)/ CI secrets:`ANTHROPIC_API_KEY` 僅供 generation;不進 repo、不進 `data/`、不進 `site/`。
- 前端建置產物經掃描確認無金鑰字串(可加 CI 檢查)。

---

## 5. 版本與可重現（接 A-5）

🔒 `manifest.json` 記錄:dpd-db tag、CBETA 年版、SuttaCentral commit、嵌入模型名+版本、build 時間。
🔒 同樣輸入 + 同 manifest → 同 `data/`(供回歸,TEST_SPEC)。

---

## 6. 部署細節

- GitHub Pages base path:若非根網域,Astro `base` 須設對,否則資源/路由錯。
- 路由:研經頁深連結用 fragment(`/read/mn1#mn1:1.1`),靜態友善(SITE_IA §2)。
- 🔧 選配 PWA / service worker → 強化離線(內容、模型快取);非 V1 必需。
- 404 / 離線 fallback 頁:🔧 應有,排實作中段。

---

## 7. V1 不做（避免越界）

- runtime 後端 / API proxy(G-3,V2)。
- 任何把金鑰放進前端的做法。
- build 與 client 用不同嵌入模型。

---

## 8. 驗收

1. 一鍵跑管線 → 產出 `data/`,內容通過契約驗證(TEST_SPEC 契約層)。
2. 站可純靜態建置並部署到 Pages,深連結正確。
3. 靜態產物掃描無金鑰。
4. 重跑管線得到相同 `data/`(可重現)。
5. 斷網後核心閱讀/搜尋仍可用(離線)。
