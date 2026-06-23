# L2 品質驗收手冊（QA Acceptance — BACKLOG H）

本文件定義 **L2 內容**（白話注 vernacular_gloss、摘要 summary、研經卡 study_cards）發佈前的
**人工驗收流程**與**自動初篩工具**。

## 信任邊界（為何 L2 需要驗收）

| 層 | 內容 | 來源 | 是否 AI | 是否需人工驗收 |
|----|------|------|---------|----------------|
| **L1** | `pali_tokens`（surface / lemma / dpd_id / morph）、`passages.agama` 阿含平行 | DPD、Bilara、CBETA 等典籍與辭典 | **否，永不 AI** | 隨資料來源版本回歸（見下）|
| **L2** | `vernacular_gloss`、`summary`、`study_cards` | Claude 生成 | **是** | **是**，本手冊主題 |

L2 三條鐵則（發佈前必須全部成立）：

1. **接地（grounded）**：每則 L2 的 `grounded_on`（card 為 `sources`）非空，指向真實 L1 token / segment。
2. **AI 生成、人工覆核**：`generated_by` 標明模型；`review_status` 必為 `approved`，且該 approved 由人工逐項核過。
3. **L1 不被 L2 污染**：L2 不得改寫、覆蓋或臆造 L1（Pāli、詞法、阿含原文）。

---

## (a) 工具：如何執行

兩支工具皆為純 Node ESM、無相依套件，掃描 `data/mn*.json` 全部上線經。
輸出同時送 stdout 與 `pipeline/.cache/`。

### 1. 自動紅旗掃描 `scripts/qa-scan-l2.mjs`

```bash
node scripts/qa-scan-l2.mjs
```

對所有上線 L2 做機器可查的初篩，輸出每經紅旗計數表＋明細＋總計到
`pipeline/.cache/qa-scan.md`。**一律 exit 0**（這是報告，不是 CI gate）。

檢測項：

| 代碼 | 意義 |
|------|------|
| `MISSING_GROUNDING` | 已 approved 的 gloss/summary 卻無 `grounded_on`（或 card 無 `sources`）|
| `TOO_SHORT` | 內容 < 2 字或空白 |
| `PLACEHOLDER` | 殘留佔位/mock 標記（PLACEHOLDER / TODO / FIXME / mock / lorem / 待填 / 佔位 …）|
| `NOT_APPROVED` | 資料中存在的 L2 但 `review_status != 'approved'` |
| `UNTRANSLATED` | 白話內容正規化後與該段 Pāli 原文相同（疑似未翻譯）|
| `READ_ERROR` | 經檔無法解析 |

> 紅旗為**初篩訊號**，不等於必錯，需人工研判（例：極短段「然。」可能合法）。
> 反之，**0 紅旗不代表內容正確**——機器查不出義理錯誤或誤譯，那是 (c) 人工驗收的職責。

### 2. 確定性抽樣 `scripts/sample-l2.mjs`

```bash
node scripts/sample-l2.mjs            # 預設 N=20，跨全部上線經
node scripts/sample-l2.mjs --n=8      # 抽 8 段
node scripts/sample-l2.mjs --sutta=mn10   # 只抽某一經
```

從候選池（所有有內容的白話注）依 **(經, segment_id) 排序後等距步長**抽 N 段，
重跑結果穩定（不用亂數/時間）。輸出驗收表到 `pipeline/.cache/l2-sample.md`，
每項含：經、segment_id、`review_status`、`grounded_on` 數、重建的 **Pāli 原文**、
**白話 L2**、對應**阿含平行**（若該段所屬 passage 有），並附 `- [ ] 已覆核` 勾選框
與 `判定/備註：` 空行供人工填寫。

---

## (b) 人工 golden 簽核流程（與既有 fixtures/golden 的關係）

既有的 `fixtures/golden/*.golden.json`（由 `scripts/build-golden.ts` 產、
`scripts/validate-golden.ts` 驗）是 **L1 管線輸出的回歸哨兵**：快照 token 的
surface/lemma/dpd_id/root/morph/ambiguous 與阿含平行有無，改管線或換資料版後重跑比對逐欄
diff，有差異即 fail。**它驗的是「L1 輸出沒退步」，不是「L2 內容被人核過」。**

L2 的人工簽核是另一條獨立軌道，與 golden 互補：

```
                ┌─────────────────────── L1 軌（既有） ───────────────────────┐
  data/*.json → build-golden.ts → fixtures/golden → validate-golden.ts (CI 回歸)
                └──────────────────────────────────────────────────────────────┘

                ┌─────────────────────── L2 軌（本手冊） ──────────────────────┐
  data/*.json → qa-scan-l2.mjs (自動初篩) ──┐
              → sample-l2.mjs (抽樣表) ──────┼→ 人工逐項核 → 填 l2-sample.md 判定
                                             └→ 全數通過 → 在下方簽核日誌登記 → 視為已簽核
                └──────────────────────────────────────────────────────────────┘
```

簽核步驟：

1. 跑 `node scripts/qa-scan-l2.mjs`，確認目標經 0 紅旗（或已逐筆研判可接受）。
2. 跑 `node scripts/sample-l2.mjs --sutta=<id> --n=<樣本數>` 產生抽樣表。
3. 覆核者逐項依 (c) 準則填 `判定/備註`（通過 / 退回 / 待議）。
4. 若有「退回」：修 `data/<id>.json` 對應 L2，將該則 `review_status` 視情況降級或更正後，
   重跑 qa-scan 與抽樣，直到該批全數通過。
5. 全數通過後，在 (e) 簽核日誌登記一列。
6. （建議）L1 同步跑 `validate-golden.ts` 確認 L1 未被連帶改動。

> 抽樣是統計把關，非全量；高風險經（義理密集、無阿含平行可對照者）應提高樣本數或全量覆核。

---

## (c) L2 驗收準則

逐項以下四面向皆「是」方可判**通過**：

1. **接地正確（grounding）**
   - `grounded_on` / `sources` 指向的 token/segment 真實存在，且白話內容確實由這些 token 推得。
   - 不得「無中生有」引入原文沒有的概念。

2. **義理安全（doctrinal safety）**
   - 不違背三藏共識教義；不夾帶宗派定見或現代臆解為「經說」。
   - 專門術語（如 ekāyana、saṅkhārā、anatta）採學界主流釋義；有歧解時於研經卡標明，勿在白話注獨斷。

3. **翻譯準確（translation accuracy）**
   - 白話忠於 Pāli 的詞法與句構（時態、格、單複數、語氣）。
   - 有阿含平行者，與漢譯對讀無重大義理衝突；若 Pāli 與阿含分歧，以 Pāli 為準並可於卡片註記差異。
   - 不漏譯、不增譯、不誤譯關鍵詞。

4. **信任邊界（trust boundary）**
   - L2 未改寫或覆蓋 L1（Pāli 原文、詞法、阿含原文）。
   - `generated_by` 已標明；`review_status` 在簽核後才為 `approved`。

任一面向不過 → 判**退回**並於備註寫明具體問題；把握不準 → 判**待議**，升級資深覆核者。

---

## (d) 目前狀態快照（供參考）

於 6 部上線經（mn2 / mn9 / mn10 / mn22 / mn118 / mn141）執行 `qa-scan-l2.mjs`：
共 1203 則白話注 + 6 則摘要 + 15 張研經卡，**自動初篩 0 紅旗**（全數 approved、全數接地、
無佔位/過短/未譯）。此僅代表通過機器初篩，內容義理仍需依本手冊 (b)(c) 人工簽核。

---

## (e) 簽核日誌（範本）

每完成一批人工驗收後新增一列。

| 日期 | 經 | 覆核者 | 樣本數 / 總數 | 結果（通過/退回 數）| 備註 |
|------|----|--------|---------------|---------------------|------|
| YYYY-MM-DD | mnXX | （姓名）| 8 / 1203 | 通過 8 / 退回 0 | |
| | | | | | |
