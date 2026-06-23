# 距 100% 完整 — 剩餘工作清單（交接用）

> 建立：2026-06-23。供 `/clear` 後新 session 接手。**現況快照 + 依優先序的可執行工作項**。
> 單一真相仍是 `BACKLOG.md`；本檔是「離 100% 還差什麼」的精簡可執行版。

## 現況快照（已完成）
- **6 部中部經上線且 L2 完整**：mn2/mn9/mn10/mn22/mn118/mn141（白話/概要/研經卡/策展問題/連音切分皆備；mn22 已補 3 卡）。
- **SEO/AEO/GEO**：研經頁 Article schema、全站 BreadcrumbList、薄字頁 noindex、完整圖示集、GSC owner 權限 + Indexing API 可主動提交（見 `[[sutta-io-gsc-indexing-api]]` 記憶）。
- **V2 L3 worker 已部署上線**：`https://sutta-l3-proxy.lightman-chang.workers.dev`（/chat、/rerank；KV 限流；secret 已設）。前端 `PUBLIC_L3_API` 已接。見 `docs/04-engineering/WORKER_DEPLOY.md`。
- **B-12 連音/複合切分**：pipeline 接 DPD `lookup.deconstructor`，token 加 `deconstruction` 欄（token_id 不變、L2 grounding 不動），DpdPopover 已顯示。
- **F 合規**：`docs/02-content/LICENSE_AUDIT.md`（逐源授權 + BY/NC/SA 分析；SC 逐譯文 N/A 結案）；字典頁 DPD、研經頁 CBETA 行內出處、footer 內容層 CC BY-NC-SA 4.0 已上線。
- **可信度工具**：`scripts/pending-review.mjs`（待核段落=0）、`scripts/qa-scan-l2.mjs`（0 紅旗/1217 段）、`scripts/sample-l2.mjs`、`docs/04-engineering/QA_ACCEPTANCE.md`。
- **harness 修復**：`generation/src/claude.ts` 大 prompt 改走 stdin（修 mn22 的 E2BIG）。

---

## 剩餘工作（依優先序）

### 1. 內容規模化 ★最大缺口（146/152 部未產）
- **現況**：只有 6 部；其餘 146 部尚無資料。`scripts/next-sutta.mjs` 下一部 = **mn1**。
- **路徑 A（自動）**：每日 cron `0 4 * * *` 跑 `scripts/daily-sutta.sh`，每日 1 部。
- **路徑 B（批次加速）**：`NEW="mn3,mn4,..." scripts/batch-suttas.sh`（**須 standalone 終端跑，勿與互動 session 同跑** → `claude -p` 併發逾時，見記憶 `[[claude-cli-build-harness-concurrency]]`）。
- **成本**：全 152 部約 $2000+ 量級（mn10≈$14、mn22≈$17）。
- **注意**：`next-sutta` 以「檔案存在」判完成 → 不會回補已存在但不完整的經；補特定經要用 `NEW=` 強制。
- **每部產出後**需：publish-clean 核准零旗標 → 旗標段落人工審（見 §3）。

### 2. 自動引擎可信度（P0；規模化前提）
- **P0-2 審核政策定案** ⬜：旗標段落由誰、多久、用 `generation/src/review.ts`(port 4567) 批核。需決策＋落為常態。
- **P0-4 cron 首次成功實跑巡檢** ⬜：**至今每次排程都被手動鎖擋而「跳過」（06-22、06-23）**，尚無一次純由 cron 成功產出。需：放掉手動批次後，盯一次 04:00 UTC 排程跑完，查 `pipeline/.cache/daily.log`（成本/旗標/push/部署）。
- 旗標段落審核可參考本 session 作法：多為 DPD 格位/詞尾同形誤旗標，逐段核對語境後 approve 併入 `data/{id}.json`。

### 3. 人工驗收 H（自動上線內容的品質關卡；需人）
- **H-1 人工核 golden** 🔶：`fixtures/golden/mn10.golden.json` 是自動快照；**人工逐欄核 ~30–50 段**那步未做。工具：`node scripts/sample-l2.mjs --n=50`。
- **H-3 研經頁原型驗收八條** ⬜：照 `docs/01-pages/STUDY_PAGE_SPEC.md` §9 逐條過。
- **H-4 L2 抽樣人工品質審** ⬜：設為每日新經常態抽查（事實/教義正確性）。工具：`scripts/sample-l2.mjs`、`scripts/qa-scan-l2.mjs`。簽核表模板見 `docs/04-engineering/QA_ACCEPTANCE.md`。

### 4. 背景脈絡層規模化 J（已上線 6 部全備）
- **J-2 此經緣起** 🔶 / **J-3 人地事 DPPN 詞條** 🔶（2026-06-23 補齊已上線 6 部）：`content/context/` 與 `content/entities/` 已含 mn{2,9,10,22,118,141}；context 從各經 nidāna 結構化（provenance canonical、derived_from 可追溯），entities 21 專名經 `dppn.ts` 接 DPPN 摘要。**後續新經**隨 daily/batch 逐經補（next-sutta 以檔案存在判完成，新經須一併新增此二檔）。
- **J-4 在典天災人禍事件標注** ⬜：DN16 跋耆戰爭、滅釋迦族、飢荒瘟疫、季風/雨安居等。
- **J-8 學界來源蒐集** ⬜：依 `docs/02-content/SOURCING_STANDARD.md` 逐條具名引用（持續工作）。

### 5. 合規收尾 F（✅ 大致簽結；剩 1 項待決策）
- **F-5 合規最終勾稽** ✅（2026-06-23）：`SPEC.md` §9 五項全勾並簽結（含 F-1 SuttaCentral 逐譯文 **N/A** 認定）。F-1/F-3/F-7/F-8 同步結案。
- **F-2 教義詞彙對照表** ✅（2026-06-23）：`content/glossary.json`（67 核心教義詞，單一真相）→ `generation/src/glossary.ts` 渲染對照區塊，注入 T1/T2/T3 system prompt（`generation/src/tasks.ts` 的 `GLOSSARY`）；`usage.ts` 排名要詞亦改由 glossary 派生。僅規範譯名一致，不動「只依提供資料／不裁決教義」鐵則。既有 6 經已人工核准沿用，新經自動套用。
- **治理紅線** ✅：`docs/02-content/COMPLIANCE_GOVERNANCE.md`（R1 NC／R2 SA／R3 BY／R4 譯文 紅線 + 變更複查 checkpoint）。LICENSE_AUDIT §3 待辦同步更新（逐頁署名/內容授權標籤皆已上線）。
- **F-9 程式碼 LICENSE 檔** ⬜（**唯一殘項**）：內容授權已定 CC BY-NC-SA 4.0；**程式碼授權待站方決策**（MIT／AGPL／保留），決後落為 repo `LICENSE` 並分層聲明（紅線 R2）。

### 6. 勘誤回流 D-11 ✅（2026-06-23）
- 回報入口已上線（footer → GitHub Issue 預填 `勘誤`）。
- 回流流程已定為常態文件：`docs/04-engineering/ERRATA_REFLOW.md`
  （Issue → 分流標籤[L1/L2/glossary/site] → 修正[直改 data 或 repack 保留 L2 或改 glossary] → 核准[pending-review=0] → 重建索引/嵌入 → 驗證 → build → `closes #<issue>` → Pages 部署）。
- 後續可選：週報納入「本期勘誤處理數」追蹤回流健康度。

### 7. L3 worker 收尾（已上線，餘觀測）
- 瀏覽器實測 `/chat` 串流（rerank 已驗證 key 端到端可用；chat streaming 待在研經頁實點）。
- 監看 Anthropic 用量/成本與 KV 速率限制（現 15/min/IP）是否需調。
- （API key 為專用、用戶已確認不輪換。）

### 8. 次要 / SEO
- **per-sutta OG 圖（P2）** ⬜：研經頁目前共用單張 `og.png`；可做帶經名的動態 OG（需圖片生成管線，中價值）。

---

## 常用指令速查
```bash
# 待核/品質掃描
node scripts/pending-review.mjs
node scripts/qa-scan-l2.mjs
node scripts/sample-l2.mjs --n=50 [--sutta=mnX]
# 週報（GA4+GSC+待核）
node scripts/weekly-report.mjs
# 補經（standalone 終端，勿與互動 session 同跑）
NEW="mn3,mn4" scripts/batch-suttas.sh   # 生成+核准+索引+嵌入+build+commit(不push)
# 補背景脈絡後重建/驗證
SUTTAS="mn1,mn2,..." pnpm -C pipeline exec tsx src/run.ts --only=index
SUTTAS="mn1,mn2,..." pnpm -C pipeline exec tsx src/run.ts --only=embed
pnpm exec tsx scripts/validate-contract.ts && pnpm -C site build
# 主動提交 Google 索引（SA 有 owner 權限；scope indexing）
#   見 docs / 記憶 sutta-io-gsc-indexing-api；urlNotifications:publish
```

## 鐵則提醒
- **`claude -p` 生成 harness 勿與互動 session 同跑**（併發逾時）。批次走獨立終端。
- repack（`--only=fetch`）會 `mergeExistingL2` 保留既有 L2；token_id 不變 → grounding 安全。
- 大 prompt 已改走 stdin（claude.ts），大經不再 E2BIG。
- push 到 main：只在用戶授權時。內容類 commit 由 `daily-sutta`/`batch` 自動產生。
