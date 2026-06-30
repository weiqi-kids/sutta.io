#!/usr/bin/env bash
# sutta.io 週報 → Slack（每週一）。比照 folk.tw 週報，但發 Slack（非 GitHub Issue）。
# 跑既有 scripts/weekly-report.mjs（它會寫 pipeline/.cache/weekly-report.md）→ 把內容發到頻道。
# 全程非 LLM（GA4/GSC API + 讀本地待核）。weekly-report.mjs 本身不改。
# crontab（台灣週一 11:00 = UTC 03:00）：0 3 * * 1 /root/sutta.io/scripts/weekly-report-slack.sh >> /root/sutta.io/pipeline/.cache/weekly.log 2>&1
set -uo pipefail
export PATH="/root/.local/bin:/usr/local/bin:/usr/bin:/bin"
export TZ="Asia/Taipei"

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO" || exit 1
CHANNEL="C0BCK9N8SSX"   # #原典-sutta-io
SLACK_NOTIFY="$REPO/scripts/slack-notify.sh"
MD="pipeline/.cache/weekly-report.md"
mkdir -p pipeline/.cache

echo "===== [weekly] $(date '+%F %T %Z') 開始 ====="

if /usr/bin/node scripts/weekly-report.mjs > /dev/null 2>&1 && [ -s "$MD" ]; then
  # Slack 訊息：加標頭 + 內文；過長（>3800 字）截斷並提示完整檔。
  BODY="$(cat "$MD")"
  if [ "${#BODY}" -gt 3800 ]; then
    BODY="$(printf '%s' "$BODY" | head -c 3800)
…（截斷，完整見 $MD）"
  fi
  printf '📅 *sutta.io 週報*\n\n%s' "$BODY" | "$SLACK_NOTIFY" "$CHANNEL" \
    || echo "[weekly] Slack 發送失敗（查 token/頻道）"
else
  printf '%s' "📅 *sutta.io 週報* — :warning: 產製失敗
weekly-report.mjs 執行失敗（可能 GA4 憑證問題）。請查 $MD 與 pipeline/.cache/weekly.log。" \
    | "$SLACK_NOTIFY" "$CHANNEL" || echo "[weekly] 失敗保底 Slack 也送不出"
fi
echo "===== [weekly] $(date '+%F %T %Z') 結束 ====="
