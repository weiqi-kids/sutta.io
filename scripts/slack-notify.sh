#!/usr/bin/env bash
# sutta.io 專屬 Slack 通報小工具（本機 cron / headless 流程用）。比照 folk.tw/scripts/slack-notify.sh。
#
# 用法：
#   scripts/slack-notify.sh <CHANNEL_ID> "訊息（mrkdwn）"
#   echo "多行訊息" | scripts/slack-notify.sh <CHANNEL_ID>
#
# Token 來源（擇一，優先序由上而下）：
#   1. 環境變數 SLACK_BOT_TOKEN
#   2. 檔案 /root/.config/sutta-io/slack-bot-token（chmod 600，單行 xoxb-...）
# Bot 需 chat:write（有 chat:write.public 則發公開頻道免邀請）。
# 設計：缺 token / 失敗都「不中斷呼叫端」，印警告並回非零，呼叫端應以 `|| true` 包住。
set -uo pipefail

TOKEN_FILE="${SUTTA_SLACK_TOKEN_FILE:-/root/.config/sutta-io/slack-bot-token}"

CHANNEL="${1:-}"
if [ -z "$CHANNEL" ]; then
  echo "[slack-notify] 用法：slack-notify.sh <CHANNEL_ID> \"訊息\"（或 stdin）" >&2
  exit 2
fi
shift

if [ $# -gt 0 ]; then TEXT="$*"; else TEXT="$(cat)"; fi
if [ -z "${TEXT//[$'\t\r\n ']/}" ]; then
  echo "[slack-notify] 訊息為空，略過" >&2
  exit 2
fi

TOKEN="${SLACK_BOT_TOKEN:-}"
if [ -z "$TOKEN" ] && [ -r "$TOKEN_FILE" ]; then
  TOKEN="$(tr -d ' \t\r\n' < "$TOKEN_FILE")"
fi
if [ -z "$TOKEN" ]; then
  echo "[slack-notify] ⚠️ 找不到 SLACK_BOT_TOKEN（env 或 $TOKEN_FILE）；略過發送" >&2
  exit 1
fi

PAYLOAD="$(jq -nc --arg ch "$CHANNEL" --arg text "$TEXT" \
  '{channel:$ch, text:$text, unfurl_links:false, unfurl_media:false}')"

RESP="$(curl -sS -X POST https://slack.com/api/chat.postMessage \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json; charset=utf-8" \
  --data "$PAYLOAD")"

if [ "$(printf '%s' "$RESP" | jq -r '.ok // false')" = "true" ]; then
  echo "[slack-notify] ✅ 已發送到 $CHANNEL（ts=$(printf '%s' "$RESP" | jq -r '.ts')）"
  exit 0
else
  echo "[slack-notify] ❌ 發送失敗：$(printf '%s' "$RESP" | jq -r '.error // "unknown"')（channel=$CHANNEL）" >&2
  exit 1
fi
