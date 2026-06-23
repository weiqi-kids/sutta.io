# BACKLOG.md — 三藏研經網站 主工作清單

> 用途：全專案任務追蹤的單一真相來源。可照 ID 勾選、指派、排序。
> 狀態：✅完成　⬜待辦　🔶進行中/部分　⛔被擋(註明被誰擋)　🅥2 已定延後 V2
> 排序原則：決策(A) 先於資料(B) 先於生成(C)/頁面(D)。設計(E)可並行。
>
> **2026-06-21 校準**：實作層曾嚴重落後本清單。經實地盤點，管線(B)、生成(C)、站台(D/G)、設計(E)
> 的程式碼與首部經 MN10 端到端產物**皆已完成並 build 成雙語靜態站**；下方狀態已對齊現況。
> 重心已轉向：**自動引擎可信度(P0)、管線精度(B-12)、人工驗收(H)、合規備料(F)、站台收尾(D-11/worker)**。

---

## P0. 自動更新引擎（規模化的前提，最優先）

> 背景：`scripts/daily-sutta.sh` 由 cron `0 4 * * * `（04:00 UTC）每日自動上 1 部中部經，
> 全流程：選經→管線→L2 生成(sonnet)→核准零旗標→重建索引/嵌入→驗證→commit+push→Pages 部署。
> crontab 於 2026-06-21 10:45 才裝上 → **首次實際觸發為 2026-06-22 04:00 UTC（產 mn1）**，此前未跑過。

| ID | 項目 | 狀態 | 說明 |
|----|------|------|------|
| P0-1 | cron 首跑前乾跑驗證 | ✅ | 2026-06-21 驗：①bash -n ②cron PATH 下 pnpm exec 解析 tsx ③非互動 git push 認證 ④claude -p headless（4.2s 回 PROBE_OK，無併發卡頓）全綠。 |
| P0-2 | **審核政策定案** | 🔶 | `publish-clean.ts` 只自動上「零旗標」段落；有旗標段落留 `data/l2-draft/` **不上線、無通知**。需定：旗標段落由誰、多久、用 `review.ts`(port 4567) 批核。 |
| P0-3 | 未核 draft 可見性 | ⬜ | 加「待核段落數」統計併入週報或 `pending-review` 報告，避免旗標段落無聲堆積。接 C-6/H-4。 |
| P0-4 | 首跑後巡檢 | ⬜ | 06-22 04:00 後查 `pipeline/.cache/daily.log`：mn1 是否成功上線、成本、旗標數、push/部署是否成功。 |

---

## A. 決策（最優先：未拍板會讓下游白做）

| ID | 項目 | 狀態 | 說明 / 選項 |
|----|------|------|------|
| A-1 | **漢譯對齊策略** | ✅ | 已定:阿含(L1,段落級)與白話(L2,從巴利生)分離。見 DATA_PIPELINE §1。 |
| A-2 | surface→DPD 詞條消歧策略 | ✅ | 已定:規則式+歧義旗標+人工複核,LLM不參與L1。見 DATA_PIPELINE §4。 |
| A-3 | runtime 是否要 LLM | ✅ | 已定:V1全部build-time預生成,runtime零LLM。對話/語意搜尋延V2。 |
| A-4 | V1 首部經確認 | ✅ | 已定:中部MN(對應中阿含T26);首樣板選平行紮實之經,MN1僅邊界測試。 |
| A-5 | 資料版本鎖定 | ✅ | 已定:manifest鎖 dpd-db tag/CBETA年版/SC commit。見 DATA_PIPELINE §2。 |
| A-6 | MVP 內容範圍(首發幾部經) | ✅ | **已定(2026-06-21):全中部 152,靠 daily-sutta cron 每日自動補 1 部**。現有 mn10;mn1 起逐部補。 |

---

## B. 資料管線（DATA_PIPELINE_SPEC ✅ 已寫）

| ID | 項目 | 狀態 | 說明 |
|----|------|------|------|
| B-1 | 寫 `DATA_PIPELINE_SPEC.md` | ✅ | 已完成,落定資料模型岔路。 |
| B-2 | 巴利經文 + 分段擷取 | ✅ | `pipeline/src/fetch.ts` 自 SuttaCentral bilara-data;mn10 已產 233 段。 |
| B-3 | 巴利 token + DPD join | ✅ | `pipeline/src/dpd.ts` 直查真實 dpd.db(2.2G);morph→人讀解碼,LLM不參與(A-2)。 |
| B-3a | 確認 dpd-db 是否已附正典逐字解析 | ✅ | 已接 dpd.db 取 lemma/root/morph/candidates;深度斷詞另立 B-12。 |
| B-4 | 漢譯阿含擷取(段落級) | ✅ | `pipeline/src/parallels.ts` MN→SC parallels→中阿含→CBETA;失敗則 agama:null 降級。 |
| B-5 | 全文 / lemma 索引產生 | ✅ | `index.ts` 產 fulltext/surface/lemma/snippets/lexicon/catalog。 |
| B-6 | 每部經預建 JSON 打包 | ✅ | `pack.ts` → `data/mn10.json`(3.3M),對齊修訂後型別。 |
| B-7 | 平行對照表擷取 | ✅ | `parallels.ts` SuttaCentral parallels → 段落級對應。 |
| B-8 | **型別修訂** | ✅ | study_page_types.ts:阿含→Passage、白話→VernacularGloss、token加ambiguous/candidates;fixture同步。 |
| B-11 | 嵌入建置(P9) | ✅ | `embed.ts` e5-small dim384(語意表面=白話+英文釋義);mn10 已產 embeddings.bin(233段)。 |
| B-12 | **巴利斷詞/連音(sandhi)策略** | ⬜ | **本輪優先**。V1 僅空白切分;sandhi/複合詞深切分未落地,錯則污染 DPD join。候選:DPD deconstructor。 |

---

## C. L2 生成（L2_GENERATION_SPEC ✅ 已寫）

| ID | 項目 | 狀態 | 說明 |
|----|------|------|------|
| C-1 | 寫 `L2_GENERATION_SPEC.md` | ✅ | 已完成。 |
| C-2 | 漢譯白話 生成規格(T1) | ✅ | 已規格化:grounded on巴利token。 |
| C-3 | 章節概要/研經卡 規格(T2/T3) | ✅ | 已規格化。 |
| C-4 | 防護欄落地規格 | ✅ | 已規格化(L2 §4),`generation/src/guardrails.ts` 已實作。 |
| C-5 | 字根/詞形 反矛盾驗證 | ✅ | 規格(L2 §5)+ guardrails.ts 格位反矛盾已實作。 |
| C-6 | `draft→approved` 校稿流程 | ✅ | `generation/src/review.ts` 本機審核頁(port 4567)+publish-clean.ts。政策面見 P0-2。 |
| C-7 | Token 成本預算 | ✅ | 實測 mn10 = $14.25(232段);152部約 $2000+ 量級可據此估。 |
| C-8 | L2 生成腳本 + 校稿工具 實作 | ✅ | `generation/src/tasks.ts`+prompts+claude harness;mn10 已生 232段白話+3研經卡。 |
| C-10 | T4 用法摘要 回填 L2_GENERATION_SPEC | ✅ | 已補:任務表+T4 prompt+成本;`usage.ts` 實作。 |
| C-11 | T5 策展重排(build期/Claude Code) | ✅ | `curate.ts` 固定問題→嵌入檢索→sonnet重排→固化 `data/curated/mn10.json`。 |

---

## D. 頁面

| ID | 項目 | 狀態 | 說明 |
|----|------|------|------|
| D-1 | 研經頁 | ✅ | STUDY_PAGE_SPEC + `site/src/.../read/[sutta].astro` 三欄;已 build read/mn10。 |
| D-1a | 研經頁 欄B 修訂 | ✅ | 白話(L2,segment)+阿含(L1,passage);popover 多解狀態。 |
| D-2 | 搜尋頁 | ✅ | SEARCH_PAGE_SPEC + `search.astro`/SearchPage.tsx(四種L1搜尋+變音輸入)。 |
| D-3 | 字典頁 | ✅ | LEXICON_PAGE_SPEC + `lexicon/index`+`lexicon/[key]`;dist 已含數百詞條頁。 |
| D-4 | 對話研經 + 任意查詢生成式重排 | 🅥2 | 需runtime託管LLM。策展重排(固定查詢)已入V1(C-11);任意查詢留V2(worker 已備)。 |
| D-5 | 導覽 / 目錄 / 經號編排 | ✅ | SITE_IA_SPEC + `browse.astro`。 |
| D-6 | 首頁 / 進入點 | ✅ | SITE_IA_SPEC §4 + `index.astro`(安靜入口+非官方聲明)。 |
| D-9 | i18n 字串外部化(實作) | ✅ | `i18n/zh-Hant.ts`+`en.ts`(真翻譯)+`/en/` 全頁鏡像雙路由;dist 已 build。 |
| D-10 | 語意搜尋實作 | ✅ | SearchPage.tsx 懶載 transformers.js(CDN)+讀 embeddings.bin 做 cosine;genrerank 走 L3 proxy。 |
| D-11 | **勘誤回報機制** | ✅ | 回報入口已上線(頁尾→GitHub Issue 預填 `勘誤`);回流流程定為常態:`docs/04-engineering/ERRATA_REFLOW.md`(Issue→分流標籤→修 L1/L2/glossary→核准→重建索引/嵌入→驗證→build→`closes #`→Pages 部署)。 |

---

## E. 設計（可與其他並行）

| ID | 項目 | 狀態 | 說明 |
|----|------|------|------|
| E-1 | 設計工藝規格 | ✅ | DESIGN_SPEC.md。 |
| E-2 | 設計 token 表 | ✅ | `design/design-tokens.css`(OKLCH 暖正典/冷AI、放大字級階梯);被 global.css @import 為單一真相。 |
| E-3 | 搜尋/字典頁 的設計延伸 | ✅ | search.css/study.css 套 design-tokens;兩頁已 build。 |
| E-4 | 元件視覺狀態清單 | ✅ | COMPONENT_STATES.md。 |

---

## F. 內容 / 編輯備料（公開發布的硬前提；尚未成品）

| ID | 項目 | 狀態 | 說明 |
|----|------|------|------|
| F-1 | SuttaCentral 各譯文授權逐筆確認 | ✅ | **N/A 結案**：本站僅用 Mahāsaṅgīti 原典（CC0）+ 站方 AI 自生譯文，未採任何第三方人工譯文（`LICENSE_AUDIT.md` §4）；紅線 R4 守住「改採他人譯文須重做稽核」（`COMPLIANCE_GOVERNANCE.md`）。 |
| F-2 | 教義詞彙對照表 | ✅ | `content/glossary.json`（67 詞，單一真相）→ `generation/src/glossary.ts` 渲染對照區塊注入 T1/T2/T3 system prompt（`tasks.ts`）；`usage.ts` KEY_WORDS 亦改由 glossary 派生。僅規範譯名，不動 grounding 鐵則。既有 6 經為人工核准內容，沿用；新經自動套用。 |
| F-3 | 署名(attribution)頁面呈現 | ✅ | 頁尾+about+llms.txt 站台層署名;字典頁 DPD、研經頁 CBETA 行內可見署名(連原站)。 |
| F-4 | 「非官方/獨立工具」聲明 | ✅ | 頁尾+about 已明確標示(站內 i18n)。 |
| F-5 | 授權合規最終勾稽 | ✅ | SPEC §9 五項全勾並簽結(含 F-1 N/A 認定);依據 `LICENSE_AUDIT.md`、紅線 `COMPLIANCE_GOVERNANCE.md`。唯一殘項:LICENSE 檔(待程式碼授權決策,見 F-9 註)。 |
| F-7 | 嵌入模型授權確認 | ✅ | e5-small=MIT,已正式記錄於 `LICENSE_AUDIT.md` §1(來源表)。 |
| F-8 | 合併授權 + share-alike 交互檢查 | ✅ | `LICENSE_AUDIT.md` §2.3 + 紅線 R2 定性:內容層整體掛 **CC BY-NC-SA 4.0**(4.0 相容 CBETA 3.0-TW 之 SA);CC0/PD/MIT 來源不加新限制、與 BY-NC-SA 相容;程式碼層與內容層分離(SA 不傳染程式碼)。 |
| F-9 | 程式碼授權 LICENSE 檔 | ⬜ | 內容授權已定(CC BY-NC-SA 4.0);**程式碼授權待站方決策**(MIT/AGPL/保留),決後落為 repo `LICENSE` 檔並分層聲明(紅線 R2)。 |

---

## G. 基礎建設 / 上線

| ID | 項目 | 狀態 | 說明 |
|----|------|------|------|
| G-0 | 建置/部署/repo 規格 | ✅ | BUILD_SPEC.md。 |
| G-1 | 靜態站骨架 + 部署(GitHub Pages) | ✅ | Astro + islands;dist(52M)+`.github/workflows/deploy.yml`(純靜態,CI不跑LLM)。 |
| G-2 | 字體自架 | ✅ | dist/_astro 自host Gentium Plus/Noto Serif·Sans TC/IBM Plex Mono/Inter woff(2)。 |
| G-3 | LLM 金鑰 proxy / worker 部署 | 🅥2 | `worker/` 程式齊備(L3 對話+重排+KV限流);待填 wrangler KV id + `wrangler secret` 才部署。 |
| G-4 | 資料版本可重現性 | ✅ | `manifest.json` 標來源版次(dpd/CBETA/bilara/e5)。 |

---

## H. 驗證 / 品質（自動上線經文的可信度關卡）

| ID | 項目 | 狀態 | 說明 |
|----|------|------|------|
| H-0 | 測試策略規格 | ✅ | TEST_SPEC.md。 |
| H-1 | golden segment 回歸基準 | 🔶 | **本輪優先**。`fixtures/golden/mn10.golden.json` 為自動快照;**人工逐欄核過(~30–50段)那步未完成**。 |
| H-2 | 資料管線回歸測試 | ✅ | `scripts/validate-golden.ts` 比對 data/ 與 golden;CI 已串。(品質取決於 H-1 人工核) |
| H-3 | 研經頁原型驗收 | ⬜ | **本輪優先**。原型已存在(read/mn10);跑 STUDY_PAGE_SPEC §9 八條。 |
| H-4 | L2 抽樣人工品質審 | ⬜ | **本輪優先**。設為每日自動新經的常態抽查(事實/教義)。接 P0-2/P0-3。 |

---

## J. 背景脈絡層（CONTEXT_SPEC ✅ 已寫）

| ID | 項目 | 狀態 | 說明 |
|----|------|------|------|
| J-1 | 寫 `CONTEXT_SPEC.md` | ✅ | 背景層:緣起/人地事/時代背景 + 四級出處標記。 |
| J-2 | 此經緣起(A) 抽取 | 🔶 | `content/context/mn10.json` 已有種子(劍磨瑟曇/拘樓國);其餘經隨 daily 補。 |
| J-3 | 人地事詞條 + DPPN 接入(B) | 🔶 | `dppn.ts` 已接;`content/entities/mn10.json` 有種子;規模化待逐經。 |
| J-4 | 在典天災人禍事件 標注 | ⬜ | DN16 跋耆戰爭、滅釋迦族、飢荒瘟疫等;季風/雨安居環境事實。 |
| J-5 | 「早期佛典的世界」總覽頁(C) | ✅ | `world.astro` 已實作(CONTEXT §5.1)。 |
| J-6 | 出處四級標記 落型別+UI | ✅ | types Provenance+SourcedFact 等;視覺值入 design-tokens。 |
| J-7 | 研究級來源標準 + 爭議標注(方法) | ✅ | SOURCING_STANDARD.md。 |
| J-8 | 實際學界來源蒐集(內容備料) | ⬜ | 依 SOURCING_STANDARD 逐條蒐集具名引用,持續工作。 |

---

## I. 已完成（保留以免遺忘進度）

| ID | 項目 | 產出 |
|----|------|------|
| I-1 | 方向分析:巴利 vs 漢譯路線、LLM定位 | (對話結論) |
| I-2 | 總架構規格:三層資料分離 L1/L2/L3 | SPEC.md |
| I-3 | 研經頁頁面規格 + 契約決策回填 | STUDY_PAGE_SPEC.md |
| I-4 | 型別契約(資料/狀態/元件props) | study_page_types.ts |
| I-5 | 測試資料(觸發每個UI狀態) | fixtures/mn1.json |
| I-6 | 設計工藝規格 | DESIGN_SPEC.md |
| I-7 | 資料源初步調研(DPD/SuttaCentral/CBETA授權) | (對話結論,待F-1細化) |
| I-8 | A區五項決策拍板(A-1~A-5) | DATA_PIPELINE §0 |
| I-9 | 資料管線規格 | DATA_PIPELINE_SPEC.md |
| I-10 | L2生成規格(prompt/防護欄/校稿/成本法) | L2_GENERATION_SPEC.md |
| I-11 | 背景脈絡層規格 | CONTEXT_SPEC.md |
| I-12 | 搜尋頁規格 | SEARCH_PAGE_SPEC.md |
| I-13 | 字典頁規格 | LEXICON_PAGE_SPEC.md |
| I-14 | 整站IA規格 + UI語言決策(繁中/i18n-ready) | SITE_IA_SPEC.md |
| I-15 | T4回填 + 四級出處落型別 | L2_GENERATION_SPEC / study_page_types.ts |
| I-16 | 設計token表 + 元件狀態清單 | design-tokens.css / COMPONENT_STATES.md |
| I-17 | 研究級來源標準 + 背景層納入V1 | SOURCING_STANDARD.md / CONTEXT_SPEC(更新) |
| I-18 | 語意搜尋離線化(嵌入/重排/策展)落規格 | SEARCH/DATA_PIPELINE/L2_GENERATION(更新) |
| I-19 | 工程規格:建置/部署/repo + 測試策略 + 產物格式 | BUILD_SPEC / TEST_SPEC / DATA_PIPELINE §6 |
| I-20 | 文件整理成可交接開發包 | tipitaka-lens/ 結構 + README 導引 |
| I-21 | **管線 P1–P9 端到端實作 + MN10 真實產物** | pipeline/ + data/mn10.json(3.3M) |
| I-22 | **L2 生成+校稿+T4/T5 實作 + MN10 生成($14.25)** | generation/ + data/l2-draft·curated/mn10 |
| I-23 | **Astro 雙語站 + 離線語意搜尋 + 自架字體 + 部署 CI** | site/(dist 52M) + .github/workflows |
| I-24 | **CI 腳本 + 每日自動更新引擎 + 週報** | scripts/(validate/scan/golden/daily-sutta/weekly) |
| I-25 | **設計系統落地(OKLCH/字級階梯/完整頁尾)** | design-tokens.css + site/src 引用 |

---

## 狀態圖例補充
🅥2 = 已定延後至 V2。　🔶 = 進行中或部分完成(細節見說明)。

---

## 關鍵路徑提示（2026-06-21 更新）

規格層與**實作層皆已完成**(管線/生成/站台/設計/CI),首部經 MN10 端到端產出並 build 成站。
剩餘重心 = **可信度與規模化**,依本輪優先序:

1. **P0 自動引擎**：P0-1 乾跑已過 ✅;待 P0-2 審核政策定案 + P0-3 待核可見性 + P0-4 首跑(06-22)巡檢。這是 152 部能否成立的前提。
2. **B-12 管線精度**：DPD deconstructor 做 sandhi/複合詞深斷詞,提升 L1 命中率(L1 品質根)。
3. **H 區人工驗收**：H-1 人工核 golden、H-3 原型驗收八條、H-4 每日新經抽查——自動上線內容的關卡。
4. **F 區合規備料**：F-1/F-5/F-8 授權清查與 share-alike 定性——**公開發布硬前提**。
5. **D-11 + worker(G-3)**：勘誤回報機制 + V2 L3 部署。

> P0 擋規模化(最先);B-12 / H / F / D-11 之後可並行。F 是對外發布前必須先結清。
