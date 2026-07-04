# TOPIC_WORKFLOW.md — 關鍵字調研與主題頁產出 SOP

> 這是 SEO 內容擴充的正式流程（比照 L2_SUBAGENT_WORKFLOW.md 的地位）。
> 紅線與慣例以 `docs/00-architecture/REDLINES.md` 為準（本文件不另立規則）：自動程序不產內容
> 屬紅線 B1–B2；本文件流程由互動 session 人工觸發、新頁 draft→用戶校稿→approved 屬慣例 C1。
> 相關：SEO_KEYWORDS.md（目標詞單一真相）、SEO_EXPECTATIONS.md（每日監控協定）。

## A. 關鍵字調研方法（每輪 ~30 分鐘，建議每月或第四梯隊耗盡時跑）

1. **Autocomplete 快篩**（真實需求變體，零成本）：
   ```bash
   curl -s "https://suggestqueries.google.com/complete/search?client=firefox&hl=zh-TW&gl=tw&q=<種子詞URL編碼>"
   ```
   種子詞來源：①競對流量型態反推（生活問題型/人物型/經典本位型）②GSC 出現的清單外詞（大腦層規則 E 的累積建議）③既有頁的變體。
2. **SERP 競爭掃描**（派 2–3 個 subagent 併行，WebSearch 台灣視角）：每詞回報「前 5 名型態／內容缺口（有無原典出處型內容）／難度 1–5／切入角度」。歷史規律：**佛法詞的 SERP 無人有「原文出處＋白話對照」**，這是本站固定護城河。
3. **材料支撐度分類**（決定能不能做）：現有經文可 ground ✅／需 DPPN 等站內資料 ✅／需新 L1（SN/KN 單經）→ 記入 B 組待議／完全無材料 → 放棄。
4. 結果寫入 SEO_KEYWORDS.md 新梯隊（含難度/材料/切入角度），commit `[skip ci]`。

## B. 主題頁產出 SOP（每頁 ~15 分鐘 agent 時間＋用戶校稿）

1. **備料**：`node scripts/topics-dump.mjs <mnN>` 產 grounding 材料到 /tmp；人物頁另從
   `pipeline/vendor/dppn.xdxf` 抽條目（lowercase `<k>` 鍵）；掃登場處可用 lemma 掃描 data/*.json。
2. **派起草 agent**（可多頁併行，模型 inherit 主對話）。prompt 必含：
   - 材料清單＝唯一允許的經文依據；「dump/DPPN 沒有的不寫、寧短勿編」
   - 目標 JSON 結構（照 content/topics/ 既有檔；review_status 一律 `"draft"`）
   - 引文鐵則：**quotes 只填 segment_ids 絕不抄原文**（build 期 resolveTopicQuote 解析，查無即 build 失敗）；每 section ≤2 組、每組 ≤4 連續段
   - 台灣繁中、不裁決教義、大乘關係並陳；FAQ 4–5 條對準真實搜尋意圖
   - ⚠️ agent 有權且應該糾正派工簡報的錯誤假設（實例：mn22 "ānando"=喜悅非人名；DPPN 節錄無目犍連死亡記載）——寧可回報材料不支持，不可硬寫
3. **正規化＋驗證**：`node scripts/topics-normalize.mjs && node scripts/validate-topics.mjs`
   （normalize 容錯 agent 的 body→paragraphs 偏差；validate 查結構＋segment 防捏造）。
4. **互鏈**：related_topics/related_suttas 接進既有叢集；必要時回頭在舊頁 related 加新頁。
5. **抽查**：教義敏感段（definition/mahayana_note）人工讀一遍。
6. **build＋上線（draft）**：`pnpm -C site build` 全綠 → commit push（**當天必 commit**，
   否則 20:30 seo-ops 清理會刪掉 site/ 未提交檔）→ `node scripts/seo-index-ping.mjs <新頁 zh+en URL>`。
7. **記分板登錄**：data/seo-daily/scoreboard.json 的 keywords 加該詞（S0）、pages 加 zh+en 兩頁。
8. **用戶校稿** → 把該檔 review_status 改 `"approved"` → rebuild → commit push（頁面自動移除「人工校稿中」）。

## C. SN/他部類單經上線 SOP（pipeline 已支援 SN）

1. `SUTTAS=<id> pnpm -C pipeline exec tsx src/run.ts --only=fetch`（bilara 巢狀路徑與雜阿含
   T0099 對照已支援；新經先在 pipeline/src/config.ts 的 SUTTA_TITLES 加標題條目）。
2. L2 白話照 L2_SUBAGENT_WORKFLOW.md（sonnet subagent 批次翻＋l2-batch-merge）；概要/研經卡同法。
3. 重建 index+embed：`SUTTAS=$(ls data/*.json | sed 's|data/||;s|\.json||' | grep -E '^[a-z]+[0-9][0-9.]*$' | paste -sd,)`
   （⚠️ 勿用 `data/sn*.json` glob——會誤中 snippets.json）。
4. content/seo/sutta-seo.json 加標題覆蓋（含消歧義詞，如轉法輪經防法輪功混流）。
5. validate-contract＋validate-topics＋build → commit push → index-ping。

## D. 節奏與觸發

- **大腦層每日**：記分板監控＋微調（自動）。規則 E 發現新詞 → Slack 建議。
- **每月 1 日**（大腦層 SLA 提醒，人工執行）：①檢查第四梯隊/候選池是否耗盡 → 跑一輪 A 調研
  ②檢查 B 組「需 L1 擴充」的詞是否因新經上線而解鎖 → 跑 C+B。
- **新經完成白話時**（L2 推進主線的副產品）：檢查該經是否解鎖候選池裡的詞（如 mn26 完成 → 佛陀生平自述頁）。
