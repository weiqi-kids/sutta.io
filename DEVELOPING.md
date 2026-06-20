# 開發與建置指南

> 技術棧：Node/TypeScript + pnpm（workspace monorepo）。Astro 5 + React islands。
> 兩個世界（BUILD_SPEC §0）：**本機 build 期**跑資料管線 + L2 生成 → 產 `data/`；
> **CI 純靜態**只 `astro build` 讀 `data/` → 部署 GitHub Pages。金鑰永不進產物。

## 安裝

```bash
pnpm install          # 需 node ≥22、pnpm 10
```

原生套件（better-sqlite3 / onnxruntime / sharp / esbuild）的 build 已在 `package.json`
的 `pnpm.onlyBuiltDependencies` 允許清單；首次 install 會編譯/下載。

## 站台（前端）

```bash
pnpm -C site dev      # 本機開發（prebuild 會把 data/ 索引複製到 public/data）
pnpm -C site build    # 產 site/dist（CI 也跑這個）
pnpm -C site preview  # 預覽 dist
```

## 資料管線（P1–P9，本機）

```bash
pnpm pipeline                 # 全跑：擷取→斷詞→DPD join→消歧→阿含→索引→嵌入→manifest
SUTTAS=mn10,mn1 pnpm pipeline # 指定經
pnpm -C pipeline run all -- --only=index   # 只重建索引
```

- 首跑會下載 dpd.db（177MB → 解壓 2.2GB 到 `pipeline/vendor/`，gitignore）。
- 嵌入用 `@huggingface/transformers` e5-small（build 與 client 同模型，向量相容）。
- 產物 `data/{sutta}.json`、`index-*.json`、`embeddings.bin`、`lexicon.json`、`snippets.json`、`suttas.json`、`manifest.json`。

## L2 生成（Claude CLI sonnet，本機 build 期）

> ⚠️ **請在獨立終端機執行，不要與互動式 Claude Code session 同時跑**——
> 兩者共用同一訂閱併發，同時跑會讓 `claude -p` 子程序高延遲甚至逾時。

```bash
pnpm generate                 # 全 MN10 白話(T1,批次)+概要(T2)+研經卡(T3) → 草稿
pnpm -C generation run all -- --limit=24   # 只生成前 24 段（試跑/省額度）
```

- 產出一律 **draft** → `data/l2-draft/{sutta}.json`（gitignore，未上線）。
- 逐批 checkpoint，可中斷續跑（已完成段不重生）。
- 防護欄：grounding 存在性、不捏經號、反矛盾（白話格位 vs DPD morph）→ 旗標記入草稿。

## 校稿（嚴格人工校稿閘，L2_GENERATION §6）

```bash
pnpm review                   # 開 http://localhost:4567 校稿工具
```

- 逐條 approve（或「核准所有無旗標項」批次）；按「套用已核准 → data/」把 approved 併入 `data/{sutta}.json`（`review_status:approved`）。
- **只有 approved 進正式站**；draft 永不上線。
- 套用後重跑 `pnpm pipeline -- --only=index` + `--only=embed`（讓白話進語意表面/索引），再 `pnpm -C site build`。

## 測試 / 驗證（TEST_SPEC）

```bash
pnpm test:contract            # 契約層：產物形狀 + 不變量（任一不過即 fail）
pnpm test:keyscan             # 金鑰掃描（靜態產物無金鑰，BUILD §4）
```

CI（`.github/workflows/deploy.yml`）：install(site) → 契約驗證 → build → 金鑰掃描 → 部署 Pages。

## 新增一部經

1. 在 `pipeline/src/config.ts` 的 `SUTTA_TITLES` 加標題；若有阿含平行，於 `parallels.ts` 的 `PARALLEL_MAP` 加對照。
2. `SUTTAS=<id> pnpm pipeline` 產 L1。
3. `SUTTAS=<id> pnpm generate` → `pnpm review` 校稿。
4. `pnpm -C site build` → commit `data/` → push（CI 自動部署）。

## 部署網域

`site/public/CNAME = sutta.io`。GitHub Pages 自訂網域已設；DNS 需指向 Pages（apex A/AAAA）。
