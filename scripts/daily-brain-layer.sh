#!/usr/bin/env bash
# sutta.io 大腦層（每日）— 比照 folk.tw seo-brain-cron.sh。
# headless claude -p（sonnet）讀現況 → 用 sonnet sub-agent 推進 L2 → 自我驗證(契約+build) →
#   過才 commit/push（觸發 Pages 部署）→ 發 🧠/🚦 Slack。失敗發 🔴 保底。絕不用 opus。
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
  echo "[brain] 鎖被佔（手動產經或其他批次進行中），今日跳過。"
  exit 0
fi

echo "===== [brain] $DATE $(date '+%T %Z') 開始（DRY_RUN=$DRY_RUN）====="
git pull --rebase --autostash origin main 2>&1 || echo "[brain] git pull 失敗（續行，用本機既有）"

PROMPT="$(cat <<PROMPTEOF
你是 sutta.io（原典研經庫）的「每日大腦層執行者」，在自有主機 cron 中以 headless 執行（非雲端、無先前對話）。sutta.io 是巴利三藏研經靜態站（Astro/pnpm，部署 GitHub Pages）。今天台灣日期＝$DATE（系統時鐘已是台灣時間，勿再 +8）。本次 DRY_RUN=$DRY_RUN。

# 任務
推進 L2 經文白話生成，**嚴格照 docs/04-engineering/L2_SUBAGENT_WORKFLOW.md 的方法**。

# 鐵則（違反即停手）
1. 模型：你自己就是 sonnet，直接翻即可（或派 model:sonnet 子代理加速）。**全程 sonnet，絕不用 opus；絕不用 \`claude -p --json-schema\` 那種強制結構化路徑（已證實會拖慢/卡死）。**
2. 只依提供的巴利＋DPD 翻譯、不杜撰、不裁決宗派教義、純台灣繁體中文；教義詞用 content/glossary.json 對照表。
3. 寫入白話**只經 scripts/l2-batch-merge.mjs**（防捏造 segment、grounded_on 正確、不覆蓋已存）。
4. 自我驗證：pnpm exec tsx scripts/validate-contract.ts 與 pnpm -C site build **都通過才 push**；任一失敗 → git checkout -- . 撤回、今日不 push、跳步驟5發 🔴。
5. 完整＝白話覆蓋 ≥98%（node scripts/run-all-progress.mjs 查）。
6. DRY_RUN=1：照常讀現況、可試產與跑 build 驗證，但**絕不 commit/push、不發 Slack**，最後只在 stdout 印「乾跑摘要」結束。

# 每日流程
## 1. 看現況
跑 node scripts/run-all-progress.mjs。優先把「已有 L1 但 L2 未達 98%」的經補完（半成品先收尾，例如 mn26）；都完整就挑接下來幾部已有 L1 的經（data/mnN.json 存在＝有 L1，資料層已備）。若 152 部全完整 → no-op，跳步驟5報 🟢。

## 2. 產 L2（你自己就是 sonnet，直接翻；不依賴子代理）
對每部目標經：
- node scripts/l2-batch-dump.mjs <id> 20  → /tmp/l2-batch-<id>.json
- **你自己讀** /tmp/l2-batch-<id>.json ＋ content/glossary.json，依鐵則把每段翻成繁體中文（台灣用語），組成 {\"segment_id\":\"譯文\",...} JSON，用 Write 寫到 /tmp/out-<id>.json（**不要用 --json-schema 之類強制結構化，正常輸出即可**）。
- node scripts/l2-batch-merge.mjs <id> /tmp/out-<id>.json 併入。
- 重複到該經 ≥98%。概要(T2)/研經卡(T3) 若缺，同樣你自己依 data/mn10.json 格式產、寫進 data/<id>.json 的 summary / study_cards。
- （加速選項）若 Agent/Task 工具可用，可派 model:sonnet 子代理平行翻多批；若工具不可用，就你自己直接翻——兩者皆 sonnet、結果一樣，不要因此卡住。
時間有限，做到一段落即可（merge 不覆蓋已存，明日自動續，不會重做）。

## 3. 重建 + 自我驗證
ALL=\$(ls data/mn*.json | sed 's|data/||;s|\.json||' | paste -sd,)
SUTTAS=\"\$ALL\" pnpm -C pipeline exec tsx src/run.ts --only=index
SUTTAS=\"\$ALL\" pnpm -C pipeline exec tsx src/run.ts --only=embed
pnpm exec tsx scripts/validate-contract.ts
pnpm -C site build
任一失敗 → git checkout -- . 撤回今日改動、不 push、跳步驟5（🔴）。

## 4. 上線（DRY_RUN=0 才做）
git add -A
git commit -m \"每日大腦層 $DATE：L2 推進\"
git pull --rebase origin main（衝突無法自動解 → git rebase --abort、放棄今日 push、跳步驟5）
git push origin main（觸發 GitHub Actions → Pages 自動部署）

## 5. 發 Slack（DRY_RUN=0 每天都發；用 Bash 跑：printf '%s' \"<整則訊息>\" | $SLACK_NOTIFY $CHANNEL）
格式（mrkdwn、人話、台灣用語、每項一行「・」、【】標題、標題用 *粗體*）：
🚦 今天要不要你出手：<🟢 不用，系統自己處理好了 ／ 🟡 建議你看一下：一句原因 ／ 🔴 需要你決定：一句事項>

🧠 *sutta.io 大腦層日報 · <M/D>*

【今天產了什麼】
・<哪幾部經、各補幾段白話/概要/卡；no-op 寫「今天沒有可推進的經，系統照常監看」>

【目前進度】
・真完整：X/152 部
・待核段落：N 段（多為 DPD 格位歧義誤旗標，需人工核定）

【狀態】
・已自動上線（GitHub Pages）／或：build 未過、今日未上線

📄 完整紀錄：data/daily-snapshot/$DATE-brain.md

## 6. 留痕
寫 data/daily-snapshot/$DATE-brain.md：今日產了哪幾部、各幾段、真完整數、待核數、有無 push、build 結果。

最後在 stdout 印 3 行內摘要（產了幾部/有無 push/有無發 Slack）。
PROMPTEOF
)"

CLAUDE_OK=1
timeout 3600 claude -p "$PROMPT" --model claude-sonnet-4-6 2>&1 \
  || { CLAUDE_OK=0; echo "[brain] claude 執行失敗或逾時"; }

# 失敗保底通報：claude 整段失敗/逾時時內部 Slack 多半沒跑到 → 補一則 🔴。DRY_RUN 不發。
if [ "$DRY_RUN" != "1" ] && [ "$CLAUDE_OK" = "0" ] && [ -x "$SLACK_NOTIFY" ]; then
  printf '%s' "🚦 今天要不要你出手：🔴 需要你看一下
:warning: *sutta.io 大腦層 $DATE — 執行中斷*
本機大腦層 headless 執行失敗或逾時，今日可能未完成產經/通報。
請查 log：/root/sutta.io/pipeline/.cache/brain-layer.log" | "$SLACK_NOTIFY" "$CHANNEL" >/dev/null 2>&1 \
    && echo "[brain] 已發失敗保底 Slack" || echo "[brain] 失敗保底 Slack 也送不出（查 token）"
fi

echo "===== [brain] $DATE $(date '+%T %Z') 結束 ====="
