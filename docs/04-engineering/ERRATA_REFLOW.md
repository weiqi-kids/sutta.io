# ERRATA_REFLOW.md — 勘誤回流流程（D-11）

> 學術可信度要求：使用者回報的錯誤須有**可追溯、可重現**的修正路徑，從回報到重新發布形成閉環。
> 回報入口已上線（頁尾「回報勘誤」→ GitHub Issue 預填 `勘誤` 標籤）；本檔定義 **Issue → 分流 → 修正 → 重新發布** 的常態流程。
> 建立：2026-06-23。

## 0. 回報入口（現況）
- 全站頁尾「回報勘誤」連至 `github.com/weiqi-kids/sutta.io/issues/new?labels=勘誤&title=[勘誤]`（`Base.astro` L238）。
- 使用者送出即帶 `勘誤` 標籤；標題已含 `[勘誤]` 前綴。

## 1. 分流（Triage）— 標籤 + 歸類錯誤層級
收到 `勘誤` Issue 後，依**錯誤屬於哪一資料層**加上對應標籤，決定修正路徑：

| 層級 | 標籤 | 例 | 修正路徑 |
|---|---|---|---|
| **L2 內容** | `L2` | 白話誤譯、概要失準、研經卡錯、策展問題排序怪 | §2.A 直接修 `data/{id}.json` 或重生該任務 |
| **L1 權威** | `L1` | DPD 詞性/字根錯標、連音切分錯、阿含對照接錯段 | §2.B 上游修 + repack（保留 L2） |
| **術語一致** | `glossary` | 同一巴利詞跨經譯名不一 | §2.C 修 `content/glossary.json` + 重生受影響經 |
| **非內容** | `site`/`a11y` | 樣式、連結壞、無障礙 | 一般前端修，與資料無涉 |
| **無效** | `wontfix`/`invalid` | 非錯誤（傳統理解差異、超出 grounding） | 回覆說明後關閉；涉教義詮釋者依「不裁決教義」原則婉拒 |

**判定原則**：先確認該段的 grounding（token/segment 是否真錯），再決定層級。**涉宗派教義詮釋的「異議」不是勘誤**（守 L2 鐵則：不裁決教義），回覆「傳統上有不同理解」並關閉。

## 2. 修正（Fix）

### 2.A L2 內容錯（最常見）
1. 定位：`node scripts/sample-l2.mjs --sutta=mnX` 找到該段 `segment_id`。
2. 二擇一：
   - **小修**：直接編 `data/{id}.json` 對應 segment 的 `content`（白話）/ `summary` / `study_cards`。**勿改 `token_id` 與 `grounded_on`**（grounding 不可斷）。
   - **重生**：刪該經 draft 對應欄後 `SUTTAS=mnX pnpm -C generation run all`，再走核准（§3）。
3. 旗標複查：`node scripts/qa-scan-l2.mjs`、`node scripts/pending-review.mjs` 應為 0 紅旗。

### 2.B L1 權威錯（DPD/切分/阿含對照）
1. 修上游：DPD 誤標多為格位/詞尾同形歧義（見既往 commit），於 pipeline 對應處修正或加註例外。
2. **repack 保留 L2**：`SUTTAS=mnX pnpm -C pipeline exec tsx src/run.ts --only=fetch`
   — `mergeExistingL2` 會保留既有 L2，**`token_id` 不變 → grounding 安全**（鐵則）。
3. 若切分變動影響 token，檢查受影響段 L2 是否需重生。

### 2.C 術語一致錯（glossary）
1. 修 `content/glossary.json`（單一真相；F-2）。
2. 重生受影響經之 T1/T2/T3（glossary 注入 prompt）：`SUTTAS=mnX pnpm -C generation run all` → 核准。
3. 既有已核准經若僅譯名不一、無事實錯，可列入「批次校正」而非逐筆急修。

## 3. 核准（守可信度關卡）
- 修正後的旗標段落經 `generation/src/review.ts`（port 4567）或人工逐段核對語境後 approve，併入 `data/{id}.json`。
- 待核可見性：`node scripts/pending-review.mjs` 須回「無待核段落」才放行。

## 4. 重新發布（Republish）
重建衍生資料 → 驗證 → 建置 → 發布（同 `daily-sutta.sh` §4–7 步驟）：
```bash
# 1. 重建索引/嵌入（搜尋反映修正後文字）
SUTTAS="mnX" pnpm -C pipeline exec tsx src/run.ts --only=index
SUTTAS="mnX" pnpm -C pipeline exec tsx src/run.ts --only=embed
# 2. 驗證契約 + golden
pnpm exec tsx scripts/validate-contract.ts
pnpm exec tsx scripts/validate-golden.ts
# 3. 建置
pnpm -C site build
# 4. commit（訊息引用 Issue 編號）+ push（觸發 GitHub Actions → Pages 部署）
git commit -m "勘誤修正：mnX <一句說明> (closes #<issue>)"
git push origin main
```
- **commit 訊息務必 `closes #<issue>`** → 自動關閉 Issue，形成回報↔修正的可追溯連結（學術可信度）。
- golden 比對若因合理內容變動而失敗：以 `pnpm run build:golden` 更新快照（確認變動為預期後）。

## 5. 閉環與留痕
- Issue 由 commit `closes #` 自動關閉；修正內容在 git 歷史可追。
- 重大或系統性錯誤（如某 DPD 格位規則普遍誤標）：除修當經外，回填本檔或 `L2_GENERATION_SPEC` 作為 guardrail，避免再犯。
- 週報 `scripts/weekly-report.mjs` 可納入「本期勘誤處理數」追蹤回流健康度（後續可加）。

## 鐵則對照
- `token_id` 不變、`grounded_on` 不斷 → grounding 安全。
- repack（`--only=fetch`）`mergeExistingL2` 保留既有 L2。
- 不裁決教義：詮釋異議非勘誤。
- push 到 main 觸發部署；內容修正比照 daily 的 commit 慣例。
