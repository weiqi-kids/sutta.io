# sutta.io — 專案定位與工作準則

> 進到這個 repo 先讀這份。它是**北極星 + 護欄**,不是操作手冊(手冊在下方「真相來源」各檔)。
> ⚠️ `README.md`、`BACKLOG.md`、`docs/REMAINING_TO_100.md` 仍是**舊框架**(「TIPITAKA-LENS 研經工具／對標聖經原文研經站／補滿中部 152 部是最大缺口」)。**那不是現在的定位。** 以本檔為準。

## 定位(重新出發後的本質)

sutta.io 是**一個從繁體中文使用者真實人生處境出發的自證儀器**——不是「把三藏搬上網的研經工具」。

某個中文使用者正被某個處境所苦(喪親、恐懼、被批評、放不下、憤怒…),站台**從那個處境的問題切入**,用能**共鳴**的白話回應他,再**一鍵把他帶到對應的巴利原典**,讓他自己在經裡驗證。

**共鳴優先,原典墊底。解決一個面向的困擾 → 引導看相關內容。** 喪親垂直(MN87 愛生經 + `marana` 主題)是已落地的範本樣板。

## 這重寫了優先序(2026-07-20)

- **軸線只有一條:中文受眾的處境問題。** 英文 `/en/` 是鏡像噪音,不給軸線地位(見記憶 [[sutta-io-audience-chinese-only]])。
- **深 > 廣。** 情境型垂直深做才是主線。「補滿中部 152 部／內容規模化」是舊目標,**已不是優先事**;三藏廣度只在「某個處境需要某部經當原典錨」時才補——**服務垂直,不是目的本身**。清點「還有什麼沒做」時,用「哪個處境還沒被接住」來問,不要用「還差幾部經」來問。
- **頁面模型 = answer-first 情境主題頁**:一句直答 → 共鳴展開 → 一鍵原典 →(延伸)。IA 已於 2026-07-08 改版(`/questions` 併入 `/topics`,見 [[sutta-io-ia-revamp]]、[[sutta-io-topics-system]])。

## 現在真正的瓶頸:站外分發(不是站內)

上線後 16 個目標詞連續零曝光、GA4 近乎零流量——這是**新站零權重/零分發**,不是站內可調項能救,站內 SEO 呈現層已飽和。

- **分發(社群、外部連結、真人渠道)由站主人工推進;自動迴圈與 session 不碰站外**,也不自行對外發文/找連結。
- 迴圈只**監看領先指標**(任一目標詞首次非零曝光／首個 organic-referral／卡住新頁成批 indexed／新反向連結),任一動才代表分發生效——此時才對出現牽引力的那一頁/主題**集中加碼**,而不是對死詞齊頭微調。零分發前提下 no-op 是正確狀態。
- 細節見記憶 [[sutta-io-onsite-saturated-offsite-bottleneck]]。

## 不可破壞的紅線

1. **繁體中文台灣用語**,一律(見 [[communicate-traditional-chinese-taiwan]])。
2. **經文內容永不捏造(B1／L1-L2 信任界線)**——這是網站可信度的命根,重新出發也不動:事實層(巴利原文、字根、對照)走 L1 權威來源、永不由 AI 生成;解釋層(白話、概要、研經卡)L2 必須掛在 L1 真實資料上(RAG)且上線前校稿。SEO 自動迴圈**絕不**產生或改寫 `data/mn*.json` 經文內容,只動 `site/src/` 呈現層與 `content/`。
3. **前端改動 push 前必做視覺驗證**:build + 截圖親眼看 + 只用已定義 design token(見 [[sutta-io-visual-verify-process]],用戶明令)。
4. **去 AI 味**:概要/研經卡/敘述文主動避開 AI 套話腔;白話直譯的經文腔不動(見 [[sutta-io-anti-ai-flavor]])。
5. **push 常態授權、清單項目自己跑**(見 [[sutta-io-push-and-run-autonomy]]);但**改變站台狀態的操作,同一回合更新對應文件**。

## 真相來源(需要時讀,勿在此重複)

- **SEO／分發／自動迴圈的單一真相**:`/root/seo-ops/MAINTENANCE.md` + `/root/seo-ops/playbooks/sutta.io.md`(strategy 區塊已含 2026-07-20 姿態調整)。
- **每日監控協定/狀態機**:`docs/04-engineering/SEO_EXPECTATIONS.md`;跨日記分板 `data/seo-daily/scoreboard.json`。
- **要補原典內容時,正式法 = sonnet sub-agent**(見 [[sutta-io-l2-via-sonnet-subagent]] 與 `docs/04-engineering/L2_SUBAGENT_WORKFLOW.md`);**勿**用 `claude -p`／`generation` harness(慢 20 倍、逾時)。
- **成長策略／垂直樣板**:記憶 [[sutta-io-growth-strategy]]。
- **記憶索引**:`/root/.claude/projects/-root-sutta-io/memory/MEMORY.md`(每個 session 自動載入)。

## 技術骨架(一句話)

Astro + pnpm monorepo:`site/`(前端)、`pipeline/`＋`generation/`(離線內容管線)。`git push origin main` → GitHub Actions build → GitHub Pages。全站純台灣繁中 +`/en/` 鏡像(鏡像非軸線)。
