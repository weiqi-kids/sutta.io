# L2_SUBAGENT_WORKFLOW.md — 用 sonnet sub-agent 產 L2 白話（取代 claude -p）

> **這是目前產 L2 白話的正式方法。** 經本 session 實證：
> sonnet sub-agent **17.7 秒翻 15 段**，品質好、零逾時、成本低；
> 舊的 `claude -p` build harness **342 秒才 10 段**、且反覆逾時、缺段、浪費輸入 token。
> 兩者差約 **20 倍**。**不要再用 `claude -p` / `generation` harness 跑 L2。**

## 為什麼 claude -p 慢又爛（已查證）
- `claude -p --json-schema <schema>` 的**強制結構化（constrained decoding）拖慢生成**，大輸出可達數百秒。
- 太短的 timeout（曾誤設 240s）把「正在生成的正常請求」砍掉 → 輸入 token 白付 + 缺段。
- sub-agent（Agent 工具）走 harness 原生機制、自由輸出 → 快、不卡、不浪費。

## 標準流程（每部經）

### 0. 確保 L1 存在（非 LLM，幾秒）
```bash
SUTTAS=<id> pnpm -C pipeline exec tsx src/run.ts --only=fetch
```
（會建 `data/<id>.json`：巴利+DPD+斷詞+阿含。已存在則可跳過。）

### 1. 匯出一批待翻段落
```bash
node scripts/l2-batch-dump.mjs <id> 20   # 每批 ~20 段；輸出到 /tmp/l2-batch-<id>.json
```

### 2. 派 sonnet sub-agent 翻譯（核心）
用 **Agent 工具、model: "sonnet"**，prompt 要點（見本檔末完整版）：
- 讀 `/tmp/l2-batch-<id>.json`（segment_id/pali/tokens）。
- 讀 `/root/sutta.io/content/glossary.json`（教義術語對照，須一致採用）。
- 鐵則：只依提供的巴利+DPD 翻、不發揮、不裁決教義、純台灣繁中。
- **只**輸出 `{"segment_id":"譯文",...}` JSON（無前後綴、無 markdown 框）。
- **可同時派多個 agent 平行翻不同批**（一則訊息內多個 Agent 呼叫 = 併發）。

### 3. 併入正式資料
把 agent 回傳的 JSON 存成檔（如 `/tmp/out-<id>-1.json`），然後：
```bash
node scripts/l2-batch-merge.mjs <id> /tmp/out-<id>-1.json
```
（只寫該經存在且未有白話的段、grounded_on=token_id、標 sonnet+approved；防捏造 segment。）

### 4. 重複 1–3 直到覆蓋 ≥98%
查覆蓋：`node scripts/run-all-progress.mjs`（已用 ≥98% 真完整定義）。

### 5. 概要(T2) 與 研經卡(T3)
同樣可派 sonnet sub-agent（給整經已譯白話 + 規則），回傳：
- 概要：150–250 字繁中，寫進 `data/<id>.json` 的 `summary = {generated_by,grounded_on,review_status:'approved',content}`。
- 研經卡：1–3 張，寫進 `study_cards` 陣列（card_id/title/content/sources/review_status）。
（格式參考既有完整經，如 `data/mn10.json`。）

### 6. 背景脈絡（J-2/J-3，選配）
`content/context/<id>.json`（緣起，從 nidāna 結構化）、`content/entities/<id>.json`（人地事專名，occ_segment 須驗證）。格式見既有檔。

### 7. 重建 + 驗證 + 上線
```bash
ALL=$(ls data/mn*.json | sed 's|data/||;s|\.json||' | paste -sd,)
SUTTAS="$ALL" pnpm -C pipeline exec tsx src/run.ts --only=index
SUTTAS="$ALL" pnpm -C pipeline exec tsx src/run.ts --only=embed
pnpm exec tsx scripts/validate-contract.ts && pnpm -C site build
git add -A && git commit -m "..." && git push origin main   # push 觸發 Pages 部署（已獲常態授權）
```

## 規模化建議
- **平行**：一則訊息內派多個 sonnet Agent（各翻一批/一經）→ 併發完成。
- 大量（124 部未產 ≈ 22,000 段）可考慮 **Workflow**（需使用者明示「ultracode」或「用 workflow」才啟動）fan-out sonnet agents；否則用「每訊息數個 Agent + merge」即可。
- 品質抽查：`node scripts/sample-l2.mjs --sutta=<id>`；待核：`node scripts/pending-review.mjs`。

## 鐵則
- **不用 `claude -p` 產 L2。** 用 sonnet sub-agent。
- 寫入只經 `l2-batch-merge.mjs`（防捏造 segment、grounded_on 正確、不覆蓋已存）。
- 完整=白話覆蓋 ≥98%（非只看 summary）。
- push 已獲常態授權（見記憶 [[sutta-io-push-and-run-autonomy]]）。
- 全程繁體中文台灣用語（見記憶 [[communicate-traditional-chinese-taiwan]]）。

---

## 附：sub-agent prompt 範本（複製即用）
```
你是巴利語研經助手，把巴利經文段落翻成現代繁體中文（台灣用語），供研經網站顯示。
步驟：
1. 讀 /tmp/l2-batch-<id>.json（陣列，每元素有 segment_id、pali 巴利原文、tokens 逐字 DPD 釋義+詞形 morph）。
2. 讀 /root/sutta.io/content/glossary.json（教義術語對照表）；表中核心教義詞若出現，中譯須採表中譯名。
3. 為每段產出流暢、準確的繁體中文白話翻譯。
鐵則：
- 只依提供的巴利+DPD 翻譯，不引入外部典故、不自行發揮。
- 忠於原文語序語意；重複公式照實翻，巴利 pe 省略可用「……」。
- 教義詞用 glossary 台灣標準譯名；不裁決宗派教義（涉詮釋處陳述「傳統上有不同理解」並止）。
- 純台灣繁體中文，勿用大陸詞。
輸出：只輸出一個 JSON 物件 {"segment_id":"中文翻譯",...} 涵蓋全部段，無任何前後文字、無 markdown 框。你的最終回覆就是這個 JSON（會被程式直接解析）。
（補充該經背景：MN<n> <經名>，內容是……）
```
