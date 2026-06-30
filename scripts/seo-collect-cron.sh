#!/usr/bin/env bash
# sutta.io 資料層「收集數據」cron 進入點。比照 folk.tw seo-collect-cron.sh。
# 純資料流、無 AI：拉 GA4+GSC → data/seo-daily/<台灣日期>.json → commit [skip ci] → push
#   → Google Indexing API 通知關鍵頁。下游（資料心跳、大腦層）讀此 JSON。**不發 Slack。**
# crontab（台灣 01:30 = UTC 17:30，排在資料心跳/大腦層之前）：
#   30 17 * * * /root/sutta.io/scripts/seo-collect-cron.sh >> /root/sutta.io/pipeline/.cache/seo-collect.log 2>&1
set -uo pipefail
export PATH="/root/.local/bin:/usr/local/bin:/usr/bin:/bin"
export TZ="Asia/Taipei"

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO" || exit 1
DATE="$(date +%F)"

echo "===== [seo-collect] $DATE $(date '+%T %Z') 開始 ====="

# 1) 同步 main（避免與其他本機 push 衝突）
git pull --rebase --autostash origin main 2>&1 || echo "[seo-collect] git pull 失敗（續行）"

# 2) 產今日 JSON（GA4+GSC）
if ! node scripts/seo-daily.mjs; then
  echo "[seo-collect] ✗ seo-daily.mjs 失敗，今日不 commit"
  echo "===== [seo-collect] $DATE $(date '+%T %Z') 結束（失敗）====="
  exit 1
fi

# 3) commit + push（[skip ci] 不觸發部署；只是留數據歷史）
git add data/seo-daily/
if git diff --cached --quiet; then
  echo "[seo-collect] 無變更，略過 commit"
else
  git commit -q -m "chore(seo): 每日數據 ${DATE} [skip ci]"
  git pull --rebase --autostash origin main 2>&1 || true
  git push origin main 2>&1 && echo "[seo-collect] ✓ 已 push 今日數據" || echo "[seo-collect] ✗ push 失敗（JSON 仍在本機，下游可讀）"
fi

# 4) Google Indexing API 通知關鍵頁（金鑰在本機；失敗不影響）
node scripts/seo-index-ping.mjs 2>&1 || echo "[seo-collect] index-ping 略過/失敗"

echo "===== [seo-collect] $DATE $(date '+%T %Z') 結束 ====="
