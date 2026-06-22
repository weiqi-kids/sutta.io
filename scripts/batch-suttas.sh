#!/bin/bash
# batch-suttas.sh — 手動批次上多部經（一次性）。流程同 daily-sutta，但：
#   固定經單 / 逐部生成(單部失敗不中斷) / 索引·嵌入跨全經 / 只 commit 不 push / 與 daily 共用鎖。
# 用法：NEW="mn2,mn9,mn22,mn118,mn141" scripts/batch-suttas.sh
set -uo pipefail

export HOME=/root
export PATH="/root/.local/bin:/usr/local/bin:/usr/bin:/bin"
REPO=/root/sutta.io
cd "$REPO" || exit 1

NEW="${NEW:?需設 NEW=逗號分隔經單}"
LOG="$REPO/pipeline/.cache/batch.log"
LOCK=/tmp/sutta-daily.lock   # 與 daily 共用：批跑時 cron 會自動跳過
mkdir -p "$REPO/pipeline/.cache"
exec >>"$LOG" 2>&1

echo ""; echo "========== BATCH $(date '+%Y-%m-%d %H:%M:%S') =========="
echo "本批新經：$NEW"

if [ -e "$LOCK" ] && kill -0 "$(cat "$LOCK" 2>/dev/null)" 2>/dev/null; then
  echo "已有 daily/batch 在執行（lock 存在），中止。"; exit 0
fi
echo $$ >"$LOCK"; trap 'rm -f "$LOCK"' EXIT

run() { echo "--- $* ---"; "$@" || { echo "✗ 步驟失敗：$*"; return 1; }; }

DONE=$(node scripts/next-sutta.mjs --done)   # 已完成（如 mn10）
echo "既有完成：${DONE:-（無）}"

# 1. 管線 L1（巴利+DPD+阿含）：僅新經
run env SUTTAS="$NEW" pnpm -C pipeline exec tsx src/run.ts --only=fetch || { echo "fetch 失敗，整批中止"; exit 1; }

# 2+3. 逐部 L2 生成 + 核准零旗標（單部失敗只跳過該部）
SUCCESS=""
IFS=',' read -ra ARR <<< "$NEW"
for S in "${ARR[@]}"; do
  echo "===== 生成 $S ====="
  if run env SUTTAS="$S" pnpm -C generation exec tsx src/run.ts && \
     run pnpm -C generation exec tsx src/publish-clean.ts "$S"; then
    SUCCESS="${SUCCESS:+$SUCCESS,}$S"
    echo "✓ $S 生成+核准完成"
  else
    echo "✗ $S 失敗，略過（其餘繼續）"
  fi
done
echo "本批成功：${SUCCESS:-（無）}"
[ -z "$SUCCESS" ] && { echo "無任何成功經，結束。"; exit 1; }

# 4. 索引 + 嵌入（全經 = 既有完成 + 本批成功）
ALL="${DONE:+$DONE,}$SUCCESS"
echo "重建索引/嵌入範圍：$ALL"
run env SUTTAS="$ALL" pnpm -C pipeline exec tsx src/run.ts --only=index || exit 1
run env SUTTAS="$ALL" pnpm -C pipeline exec tsx src/run.ts --only=embed || exit 1

# 5. 驗證
run pnpm exec tsx scripts/validate-contract.ts || exit 1
run pnpm exec tsx scripts/scan-secrets.ts || exit 1
run pnpm exec tsx scripts/validate-golden.ts || echo "（golden 比對非致命，續）"

# 6. 建站煙霧測試
run pnpm -C site build || exit 1

# 7. commit（不 push；由人工決定何時推）
git add -A
if git diff --cached --quiet; then echo "無變更，跳過提交。"; exit 0; fi
git commit -q -m "手動批次 A：策展名經 $SUCCESS 上線

管線→DPD→阿含→sonnet 白話/概要/卡→核准無旗標→重建索引/嵌入。未 push。

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
echo "✓ 已 commit（未 push）：$SUCCESS"
echo "========== BATCH DONE $(date '+%Y-%m-%d %H:%M:%S') =========="
