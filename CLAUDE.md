# sutta.io — 專案定位與工作準則

> 進到這個 repo 先讀這份。它是**北極星 + 護欄**,不是操作手冊(手冊在下方「真相來源」各檔)。
> ⚠️ `README.md`、`BACKLOG.md` 頂部、`docs/REMAINING_TO_100.md` 仍含**舊框架**(「TIPITAKA-LENS 研經工具／對標聖經原文站／補滿中部 152 部是最大缺口」)。**那不是現在的定位。** 以本檔＋記憶 [[sutta-io-growth-strategy]] 為準。

## 定位(2026-07-14 第一性原理推導,站主已認可)

**本質**:sutta.io 是**為中文受苦求道者而生的、能親自驗證早期佛陀教法的自證儀器(ehipassiko)**——不是「有中文版的巴利研經工具」。

深層需求 = **受苦 ＋ 不信任被稀釋的教法 ＋ 想親自查證**。這需求在中文圈嚴重未被滿足(CBETA 文言無巴利、莊春江服務已入門者、民間/商業佛教「稀釋」厚);在英文圈早被巨頭填滿(SuttaCentral/ATI/DPD)。

→ **英文不是次要市場,是錯的戰場。軸線只有中文受眾**;`/en/` 是鏡像噪音,不給軸線地位(見 [[sutta-io-audience-chinese-only]])。中文性本身就是護城河。

## 瓶頸與打法(這決定優先序)

- **瓶頸 = 獲取**(不是留存、不是內容量)。新站低權威,**大詞(無我/四聖諦/八正道)排不上——別追大詞;能贏的是長尾中文求道者查詢**(具體人生苦 + 原始佛教/阿含/佛陀原話)。
- **主題頁分兩類**:
  - **定義型**(無我/五蘊/四聖諦…抽象教義)= 大詞紅海、不在受苦當下 → **低優先**。
  - **情境型**(喪親/恐懼/被毀謗/放下…當下的苦)= 長尾可贏、莊春江不這樣組織 → **楔子、主線**。
- **做法**:挑一個苦的垂直**深做到底**(主題權威來自**縱深不是廣度**),驗證「**排得上 → 有人讀 → 回訪**」再複製到下一個苦。
- **每頁鐵律**:共鳴優先(先接住受苦者當下的真實,definition 第一句別用經名開頭)＋一鍵可驗證原典(引文深連 `/read`,防捏造)＋誠實邊界(經文沒說的不替它說)＋避 AI 套話腔([[sutta-io-anti-ai-flavor]])。

## 現行實驗:4 垂直並列對比(進行中,別擅自收掉)

2026-07-14 同日起跑 4 個屬不同苦家族的情境垂直,同標準,比較「哪一類苦最能排得上→有人讀→回訪」,勝出家族再加深/複製:
- **marana**(悲傷·MN87 愛生經)／**facing-fear**(恐懼·MN4 怖駭經)／**facing-criticism**(瞋恨·MN21 鋸喻經)／**letting-go**(貪執·MN2 一切漏經)。
- **觀察窗 = 2–4 週(threshold 28 天)**,不是 7 天。別被自動迴圈「第 7 天下結論」的假期限逼著提早收——那違反站主定調。

## 鐵律:先讓數據跑,勿預先投入(暫緩待辦有明確觸發)

站主定調:**有流量風向才做,不預先投入**。以下在觸發前**主動去做 = 違反定調**(BACKLOG J-1/J-2/J-3):
- **J-1** en 主題頁 answer-first —— 觸發 = **en 出現實質流量**。
- **J-2** 擴充情境垂直(MN20 負面念頭 / MN13 慾望)—— 觸發 = **4 垂直跑出贏家家族 → 複製其模式**。(所以現在該做的不是開新垂直,是等對比出贏家。)
- **J-3** 補 7 部經 L2(mn26/31/34/37/40/41/42)—— 觸發 = **某經成為有流量主題的錨經**。(這 7 部「半成品」是**刻意暫緩**,不是待收尾的 loose end。)

風向讀週報 🔬 區(`buildVerticalCompare`)與 reflect 觀察項,勿憑感覺提前投入。

## 現階段補充動作(2026-07-20,本 session 與站主確認)

上線後大詞連續零曝光、GA4 近乎零流量——這是新站零權重,**站內 SEO 呈現層已飽和**,不是站內可調項能救。作為對「獲取瓶頸」的補充(與長尾 SEO 並行):
- **站外分發(社群/外部連結/真人渠道)由站主人工推進;自動迴圈與 session 不碰站外**,不自行對外發文或找連結。
- 迴圈只**監看領先指標**(任一目標詞/情境頁首次非零曝光、GA4 首個 organic-referral、卡住新頁成批 indexed、新反向連結),任一動才對出現牽引力的那頁**集中加碼**。零分發前提下 no-op 是正確狀態。詳見 [[sutta-io-onsite-saturated-offsite-bottleneck]]。

## 不可破壞的紅線

1. **繁體中文台灣用語**,一律([[communicate-traditional-chinese-taiwan]])。
2. **經文內容永不捏造(B1／L1-L2 信任界線)**——網站命根,重新出發也不動:事實層(巴利原文/字根/對照)走 L1 權威、永不由 AI 生成;解釋層(白話/概要/研經卡)L2 必須掛在 L1 真實資料上且上線前校稿。SEO 自動迴圈**絕不**產生或改寫 `data/mn*.json` 經文,只動 `site/src/` 呈現層與 `content/`。
3. **前端改動 push 前必做視覺驗證**:build + 截圖親眼看 + 只用已定義 design token([[sutta-io-visual-verify-process]],站主明令)。
4. **改變站台狀態的操作,同一回合更新對應文件**;push 常態授權、清單項目自己跑([[sutta-io-push-and-run-autonomy]])。

## 真相來源(需要時讀,勿在此重複)

- **成長策略/垂直可複製樣板(最重要)**:記憶 [[sutta-io-growth-strategy]]。
- **SEO/分發/自動迴圈單一真相**:`/root/seo-ops/MAINTENANCE.md` + `/root/seo-ops/playbooks/sutta.io.md`。
- **每日監控協定/狀態機**:`docs/04-engineering/SEO_EXPECTATIONS.md`;記分板 `data/seo-daily/scoreboard.json`;垂直對比觀察 `seo-ops/state/sutta.io/observations.json`。
- **要補原典內容時(且已觸發)正式法 = sonnet sub-agent**([[sutta-io-l2-via-sonnet-subagent]] / `docs/04-engineering/L2_SUBAGENT_WORKFLOW.md`),勿用 `claude -p` harness。
- **記憶索引**:`/root/.claude/projects/-root-sutta-io/memory/MEMORY.md`(每 session 自動載入)。

## 技術骨架(一句話)

Astro 5 + React islands,pnpm monorepo:`site/`(前端)、`pipeline/`＋`generation/`(離線內容管線)、`contracts/`。`git push origin main` → GitHub Actions build → GitHub Pages(自訂網域 sutta.io)。全站純台灣繁中 +`/en/` 鏡像(鏡像非軸線)。設計單一來源 `site/src/styles/variables.css`(OKLCH,暖=正典/冷=AI 色溫即信任層級;原 `design/design-tokens.css` 2026-07-20 遷入)。**設計規範 v2 守門**(2026-07-20 全站統一):`site/scripts/check-design.mjs` 接在 `pnpm build` 前自動跑,五條=禁 px 字級(--text-* 階梯)/顏色只准 variables.css/禁 important 覆寫/禁外部 CDN/css 檔白名單 `src/styles/{variables,global}.css`(components/{study,search} 兩檔遷移期凍結,禁再擴充);CI fail 由 deploy.yml `notify-failure` 發 Slack(secrets 未設則靜默略過)。
