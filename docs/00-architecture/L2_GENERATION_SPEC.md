# L2_GENERATION_SPEC.md — L2 生成規格（Sonnet 輔助）

> 對應 BACKLOG C-1~C-7。承接 DATA_PIPELINE §P6。
> A-3 已定：**V1 全部 build-time 預生成，runtime 零 LLM。** 對話/語意搜尋延 V2。
> 鐵則：L2 永遠 grounded on L1；缺依據降級不硬生；上線前一律人工校稿。

---

## 1. V1 的 L2 任務

| 任務 | 輸入(L1 依據) | 輸出 | 粒度 |
|---|---|---|---|
| T1 漢譯白話 | 該 segment 的巴利 token + DPD(lemma/root/morph/gloss) | 逐字白話 + 用字說明 | segment |
| T2 章節概要 | 該章所有 segment 全文 | 摘要 | 章 |
| T3 研經卡 | 指定 segment 群 + DPD 詞條 | 結構化重點卡 | 經/主題 |
| T4 用法摘要 | 該字**實際出現的句子**(concordance) + DPD 詞條 | 該字跨語境用法差異摘要 | lemma |
| T5 策展重排 | **固定策展問題** + 嵌入檢索的候選 segment | 重排後結果 + 簡述為何相關 | 每經數題 |

**T4 成本控制**:逐 lemma 量大。V1 **僅對高頻字 + F-2 教義要詞**生成(LEXICON §5);其餘 lemma 不附摘要,不影響 L1 查詢。

**T5 範圍**:僅**固定策展問題**(非任意查詢)。任意查詢的生成式重排 = runtime,延 V2。T5 於 build 期經 **Claude Code / Sonnet** 執行,結果校稿後固化成靜態檔(SEARCH §6c)。

**V2（不在本版）**：語意搜尋、對話研經（需 runtime LLM + G-3 proxy）。

---

## 2. 通用 grounding 原則

每次呼叫，context **必含**對應 L1，且 prompt 明令「只依據提供的資料」：
- token 級任務（T1）：傳入該 segment 全部 token 的 `{surface, lemma, root, morph_display, gloss}`。
- 章/經級任務（T2/T3）：傳入該範圍 segment 的巴利原文 + 已生成且**已校稿**的 token 白話。
- **絕不**讓模型自行「回憶」經文或字根——一律由 context 提供。
- 模型輸出**必附**它依據的 `segment_id` / `token_id`（寫入 `grounded_on`）。

---

## 3. 各任務 prompt 規格

### T1 漢譯白話（system）
```
你是巴利語研經助手。只依據下方提供的 token 資料做現代中文逐字解釋。
規則：
- 不得使用提供資料以外的字根、詞形資訊。
- 每個 token 的解釋須與其 lemma/root/morph 一致；若資料不足，標「資料不足」，不臆測。
- 不裁決宗派教義；涉及詮釋處，陳述「此處傳統上有不同理解」並止。
- 輸出 JSON：{ "tokens":[{token_id, gloss_zh, note?}], "segment_gloss_zh" }
- 只輸出 JSON，無前後綴。
```
輸入：`{segment_id, tokens:[{token_id,surface,lemma,root,morph_display,gloss}]}`

### T2 章節概要（system）
```
依據下方該章巴利原文與已校稿白話，寫 150–250 字現代中文概要。
規則：只據提供內容；不引入外部典故；不裁決教義爭議；客觀陳述本章談什麼、結構為何。
輸出 JSON：{ "summary_zh", "grounded_on":[segment_id...] }
```

### T3 研經卡（system）
```
依據指定 segment 群與 DPD 詞條，產 1–3 張重點卡。
每卡：{title, content_zh, sources:[segment_id...]}。
規則：title 點明「字詞/句式/結構」何種重點；content 不超過 60 字；只據提供資料。
輸出 JSON：{ "cards":[...] }
```

### T4 用法摘要（system）
```
依據下方某字在經中「實際出現的句子」與其 DPD 詞條，寫此字跨語境的用法差異摘要。
規則：
- 只據提供的出現句與 DPD；不得引入未提供的例證。
- 描述「在哪些語境作何義/何用」，附代表性出現處 segment_id。
- 不裁決教義詮釋；該字若涉宗派理解差異，陳述「傳統上有不同理解」並止。
- 輸出 JSON：{ "summary_zh", "senses":[{gloss, segment_ids[]}], "grounded_on":[segment_id...] }
```
輸入：`{lemma, dpd:{root,morph_display,meaning}, occurrences:[{segment_id, sentence}]}`
（僅高頻/要詞觸發；其餘 lemma 跳過，字典頁顯「暫無摘要」。）

### T5 策展重排（system）
```
你在重排一個「固定研經問題」的候選段落。只依據提供的候選 segment 內容判斷相關度。
規則：
- 只對提供的候選重排,不得引入未提供的 segment。
- 依與問題的真實相關度排序;每段附一句「為何相關」,只據該段內容。
- 不裁決教義;涉詮釋處陳述「傳統上有不同理解」並止。
- 輸出 JSON：{ "ranked":[{segment_id, reason_zh}], "grounded_on":[segment_id...] }
```
輸入：`{question_zh, candidates:[{segment_id, pali, vernacular_gloss, agama?}]}`
（候選來自 P9 嵌入檢索;此任務於 build 期經 Claude Code 執行,結果校稿後固化。）

---

## 4. 防護欄（可測判準，落地 C-4）

| 判準 | 檢查方式 |
|---|---|
| 不得無依據生成 | context 未含對應 L1 → 該任務不執行 |
| 引用真實存在 | 輸出的 `grounded_on` 每個 id 必須存在於該經 → 自動比對 |
| 不捏造經號 | 輸出不得出現 context 未提供的經號 → 正則 + 白名單比對 |
| 教義中立 | 抽樣人工審（H-4）；偵測斷言式宗派裁決字樣 |
| 降級誠實 | 資料不足時須出現「資料不足/無法判定」而非編造 |

---

## 5. 反矛盾驗證（C-5，本規格的關鍵防線）

T1 輸出**自動**比對：
1. 每個 `token_id` 的白話，其隱含詞性/格位**不得與 DPD 的 `morph` 衝突**（規則比對，如 morph 標 acc 而白話講「主詞」→ flag）。
2. 提及的字根**不得與 DPD `root` 不符**。
3. 任何 flag → 該 token 白話退回 `draft` 並標「待人工」，不得自動 approved。

> 這是「模型不准講出與 L1 矛盾的話」從原則變成檢查的地方。

---

## 6. 校稿流程（C-6）

```
build 產 L2 → review_status:"draft"
   → 反矛盾驗證(§5) 過 → 進人工校稿佇列
   → 人工審(事實/教義/通順) → approved
   → 固化進靜態預建 JSON 上線
```
- 只有 `approved` 進正式站；`draft` 僅供內部預覽。
- 校稿工具 V1 可極簡：一個讀 build 輸出、逐條 approve/退回的本地清單頁（非公開）。
- 退回的條目附原因，回流改 prompt 或補 L1。

---

## 7. 成本估算（C-7）

每部經一次性 build 成本 ≈ Σ(任務數 × 平均 token I/O × 單價)。
- T1 逐 segment：最大宗，按 segment 數估。
- T2/T3：按章/主題數估，量小。
- T4：僅高頻/要詞,按該白名單字數估,非全 lemma。
- T5：每經數題 × 候選數,量小;build 期一次性。
- 因 build-time 預生成 + 固化，**runtime 成本為 0**；重算僅在資料改版或 prompt 更新時。
- 輸出一張 per-collection 成本表供上線前核算。

---

## 8. 模型與呼叫

- 模型：`claude-sonnet-4-6`（build-time 批次）。
- 無 runtime 呼叫（A-3），故 V1 無需金鑰 proxy。
- 呼叫於 build 機器執行(可用 **Claude Code/CLI** 當 build harness),金鑰留 CI/本機環境，不入靜態產物。
- V2 若開對話/語意搜尋，再依 BACKLOG G-3 補 serverless proxy。
