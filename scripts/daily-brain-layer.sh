#!/usr/bin/env bash
# sutta.io 大腦層（每日 SEO 優化）— 比照 folk.tw seo-brain-cron.sh。
# headless claude（sonnet）讀 GA4/GSC 訊號 → 對「既有網站」做 SEO 優化/微調（meta/標題/
#   結構化資料/內部連結/sitemap/i18n SEO 字串）→ 自我驗證 build → 過才 commit/push（觸發
#   Pages 部署）→ 發 🤖/🚦 Slack。失敗發 🔴 保底。
# **絕對紅線：絕不產生或修改 L2 經文內容（白話/概要/研經卡）—— 那是人工手動的工作。**
# crontab（台灣 02:40 = UTC 18:40，排在資料層之後）：
#   40 18 * * * /root/sutta.io/scripts/daily-brain-layer.sh >> /root/sutta.io/pipeline/.cache/brain-layer.log 2>&1
# 乾跑：DRY_RUN=1 scripts/daily-brain-layer.sh
set -uo pipefail
export PATH="/root/.local/bin:/usr/local/bin:/usr/bin:/bin"
export TZ="Asia/Taipei"
export IS_SANDBOX=1   # Claude Code 認可的 root 旁路，讓 headless 得以運行

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO" || exit 1
mkdir -p data/daily-snapshot pipeline/.cache

DRY_RUN="${DRY_RUN:-0}"
DATE="$(date +%F)"
CHANNEL="C0BCK9N8SSX"   # #原典-sutta-io
SLACK_NOTIFY="$REPO/scripts/slack-notify.sh"
LOCK=/tmp/sutta-daily.lock

# flock 防重入（與手動產經/其他批次共用鎖）；拿不到鎖就跳過（不阻塞）。
exec 9>"$LOCK"
if ! flock -n 9; then
  echo "[brain] 鎖被佔（手動作業進行中），今日跳過。"
  exit 0
fi

echo "===== [brain] $DATE $(date '+%T %Z') 開始（DRY_RUN=$DRY_RUN）====="
git pull --rebase --autostash origin main 2>&1 || echo "[brain] git pull 失敗（續行，用本機既有）"

PROMPT="$(cat <<PROMPTEOF
你是 sutta.io（原典研經庫）的「每日 SEO 優化執行者」，在自有主機 cron 中以 headless 執行（非雲端、無先前對話）。sutta.io 是巴利三藏研經靜態站（Astro/pnpm，部署 GitHub Pages），頁面有研經頁 /read/mnX、主題頁 /topics/<slug>、字典頁 /lexicon/<key>、中阿含對照 /agama、尼柯耶導覽 /nikaya、世界/搜尋/關於等。今天台灣日期＝$DATE（系統時鐘已是台灣時間，勿再 +8）。本次 DRY_RUN=$DRY_RUN。

# 目標詞（優化的錨）
先 Read docs/04-engineering/SEO_KEYWORDS.md——這是本站的目標關鍵字清單（18 詞三梯隊）與各詞對應頁面。每日優化以「這些詞的曝光/排名/點擊」為主要判讀對象；GSC 出現清單外的雜訊詞（如股票詞打到字典頁）不值得追。

# 你的任務：對「既有網站」做 SEO 優化/微調，再把做了什麼發 Slack。比照 folk.tw 大腦層。

# 紅線與慣例（定義見 docs/00-architecture/REDLINES.md，勿擴大解讀；違反即停手）
1. **紅線 B1——絕不產生或修改經文內容**：data/mn*.json 裡的 vernacular_gloss（白話）、summary（概要）、study_cards（研經卡）一律**不准動、不准新增、不准補**。經文內容不是這支 SEO cron 的工作。你**只能動網站呈現/SEO 層**。
2. **紅線 B2——可動的範圍**：site/src/ 下的頁面 meta/title/description、OG/JSON-LD 結構化資料、麵包屑、內部連結、heading/alt、sitemap、robots、i18n 的 SEO 字串；content/seo/sutta-seo.json（研經頁標題覆蓋表）。**不要動 data/ 內容、不要動 pipeline/generation 邏輯。**（慣例 C1：content/topics/*.json 解說內文已人工校稿，不動；其 seo_title/seo_description 可依訊號微調。）
3. 不杜撰事實；補任何事實型敘述前先 WebSearch 權威源（SuttaCentral／學界）。涉教義不裁決。純台灣繁體中文。
4. 每天最多改 5 個檔，寧少勿多；沒有可行動訊號就 no-op，不要為動而動、不要亂改全站。
5. 自我驗證：pnpm -C site build（若動到 contract/資料結構才另跑 pnpm exec tsx scripts/validate-contract.ts）。任一非零 → git checkout -- . 撤回、今日不 push、跳步驟5發 🔴。
6. DRY_RUN=1：可讀數據、在工作樹試改與跑 build 驗證，但**絕不 commit/push、不發 Slack**，最後只在 stdout 印「乾跑提案摘要」結束。

# 每日流程
## 1. 讀 SEO 訊號（資料層已備好今日 JSON）
ls -t data/seo-daily/*.json | head -1 取最新、Read 之。含 ga4（sessions、taiwanOrganicSessions、topPages）、gsc（totals、topQueries、topPages、strikingDistance＝排名 5–15 最該推一把、highImpZeroClick＝高曝光零點擊）、index（coverage 收錄狀態）。若最新 JSON 不存在或各段皆 {error} → 無數據，跳步驟5報 🟡。

## 2. 驗證昨天
讀昨天 data/daily-snapshot/<昨日>-brain.md（若有），對照今日數據看昨天的 SEO 調整有沒有效（資料區間未動時「持平」正常）。

## 3. 定本日 SEO 優化（依訊號、保守；擇要、≤5 檔）
- 曝光高/點擊低的頁 → 改該頁 title/description/H1 更貼搜尋字詞（研經頁/字典頁的 SEO 字串多在 site/src/i18n 或頁面模板）。
- 排名 5–15 的字 → 在相關頁補內部連結、強化導覽可見度（**改的是連結/導覽/標題，不是經文**）。
- 結構化資料（JSON-LD）補強：研經頁 Article、麵包屑 BreadcrumbList、字典頁 DefinedTerm 等。
- 相關經／相關字詞互相內鏈；sitemap／OG／i18n SEO 字串修補。
- 本站搜尋訊號可能很弱：**今天沒有可行動訊號就 no-op**。

## 4. 執行 + 自我驗證 + 上線（DRY_RUN=0 才 push）
- 紅線內改 ≤5 檔（只動 site/，**絕不動 data/mn*.json 內容**）。事實型先 WebSearch 查證。
- pnpm -C site build（必要時 validate-contract）。失敗 → git checkout -- .、不 push、跳步驟5（🔴）。
- 有改動且 DRY_RUN=0：git add -A、git commit -m \"每日 SEO 優化 $DATE：<一句摘要>\"、git pull --rebase origin main（衝突無法解 → git rebase --abort、放棄今日 push、跳步驟5）、git push origin main（觸發 GitHub Actions → Pages 部署）。
- push 後通知 Google 重收錄：node scripts/seo-index-ping.mjs <本次改動頁的完整 https://sutta.io/... 網址，空白分隔>（no-op 無 URL 可推則略過）。

## 5. 發 Slack（DRY_RUN=0 每天都發；用 Bash：printf '%s' \"<整則訊息>\" | $SLACK_NOTIFY $CHANNEL；一律人話、台灣用語、禁術語/英文縮寫/commit hash）
🚦 今天要不要你出手：<🟢 不用，系統自己處理好了 ／ 🟡 建議你看一下：一句原因 ／ 🔴 需要你決定：一句事項>

🤖 *sutta.io SEO 優化日報 · <M/D>*

【目前成效】
・台灣 Google 搜尋來的訪客：N 人（昨天 M，↑成長／↓下滑／持平）
・網站在 Google 被看到 N 次、有人點 M 次（Google 數據有 2–3 天延遲，本週數字下週才更新）

【今天做了什麼】
・<一句總述改了哪頁的什麼 SEO；no-op／無數據就寫「今天沒有需要調整的地方，系統照常監看」並省略下面細節>

【昨天的調整有沒有效】
・<進步／持平／退步白話；資料未更新就寫「還看不出來，Google 數據要 2–3 天才更新」>

📄 完整紀錄：data/daily-snapshot/$DATE-brain.md

## 6. 留痕
寫 data/daily-snapshot/$DATE-brain.md：① 昨日 SEO 調整勝負 ② 今日判讀 ③ 改了哪些檔/SEO、依據哪些訊號、預期效果、build/push 結果。技術細節寫這裡，不寫進 Slack。

最後在 stdout 印 3 行內摘要（改了幾項 SEO／有無 push／有無發 Slack）。
PROMPTEOF
)"

CLAUDE_OK=1
timeout 3600 claude -p "$PROMPT" --model claude-sonnet-5 2>&1 \
  || { CLAUDE_OK=0; echo "[brain] claude 執行失敗或逾時"; }

# 殘留清理：claude 該留的會自行 commit；此刻仍未提交的是 DRY_RUN 試改/gate-fail/no-op 痕跡，
# 清回 HEAD 以免污染隔天 git pull --rebase。**只清 site/（SEO 層），絕不碰 data/（內容）與 scripts/。**
if [ -n "$(git status --porcelain -- site 2>/dev/null)" ]; then
  echo "[brain] 清理未提交殘留：site/"
  git checkout -- site 2>/dev/null || true
fi

# 失敗保底通報：claude 整段失敗/逾時時內部 Slack 多半沒跑到 → 補一則 🔴。DRY_RUN 不發。
if [ "$DRY_RUN" != "1" ] && [ "$CLAUDE_OK" = "0" ] && [ -x "$SLACK_NOTIFY" ]; then
  printf '%s' "🚦 今天要不要你出手：🔴 需要你看一下
:warning: *sutta.io SEO 優化 $DATE — 執行中斷*
本機大腦層 headless 執行失敗或逾時，今日可能未完成優化/通報。
請查 log：/root/sutta.io/pipeline/.cache/brain-layer.log" | "$SLACK_NOTIFY" "$CHANNEL" >/dev/null 2>&1 \
    && echo "[brain] 已發失敗保底 Slack" || echo "[brain] 失敗保底 Slack 也送不出（查 token）"
fi

echo "===== [brain] $DATE $(date '+%T %Z') 結束 ====="
