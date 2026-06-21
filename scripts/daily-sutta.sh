#!/bin/bash
# daily-sutta.sh — 每日自動上 1 部經（中部）。
# 流程：選下一部 → 管線(L1+阿含) → L2 生成(sonnet) → 核准無旗標 → 重建索引/嵌入 → 驗證 → commit+push → Pages 自動部署。
# 由 cron 每日呼叫。失敗不中斷隔日；鎖防重疊；全程寫日誌。
set -uo pipefail

export HOME=/root
export PATH="/root/.local/bin:/usr/local/bin:/usr/bin:/bin"
REPO=/root/sutta.io
cd "$REPO" || exit 1

LOG="$REPO/pipeline/.cache/daily.log"
LOCK=/tmp/sutta-daily.lock
mkdir -p "$REPO/pipeline/.cache"
exec >>"$LOG" 2>&1

echo ""
echo "========== $(date '+%Y-%m-%d %H:%M:%S') =========="

# 鎖（防與上一輪重疊）
if [ -e "$LOCK" ] && kill -0 "$(cat "$LOCK" 2>/dev/null)" 2>/dev/null; then
  echo "上一輪仍在執行，跳過本次。"; exit 0
fi
echo $$ >"$LOCK"
trap 'rm -f "$LOCK"' EXIT

NEXT=$(node scripts/next-sutta.mjs)
echo "下一部：$NEXT"
if [ "$NEXT" = "DONE" ]; then echo "中部 152 部已全部完成，無需更新。"; exit 0; fi

DONE=$(node scripts/next-sutta.mjs --done)
ALL="${DONE:+$DONE,}$NEXT"
echo "本次建置範圍：$ALL"

run() { echo "--- $* ---"; "$@" || { echo "✗ 步驟失敗：$*（本次中止，明日重試）"; exit 1; }; }

# 1. 管線：L1（巴利+DPD+阿含）；merge 既有 L2
run env SUTTAS="$ALL" pnpm -C pipeline exec tsx src/run.ts --only=fetch
# 2. L2 生成（僅新經）
run env SUTTAS="$NEXT" pnpm -C generation exec tsx src/run.ts
# 3. 核准「防護欄全過」→ 併入 data（有旗標者保留 draft）
run pnpm -C generation exec tsx src/publish-clean.ts "$NEXT"
# 4. 重建索引 + 嵌入（全經）
run env SUTTAS="$ALL" pnpm -C pipeline exec tsx src/run.ts --only=index
run env SUTTAS="$ALL" pnpm -C pipeline exec tsx src/run.ts --only=embed
# 5. 驗證（契約 + golden + 金鑰）
run pnpm exec tsx scripts/validate-contract.ts
run pnpm exec tsx scripts/validate-golden.ts
run pnpm exec tsx scripts/scan-secrets.ts
# 6. 建站煙霧測試（確保可建）
run pnpm -C site build

# 7. commit + push（觸發 GitHub Actions 部署）
git add -A
if git diff --cached --quiet; then echo "無變更，跳過提交。"; exit 0; fi
git commit -q -m "每日更新：$NEXT 上線（自動）

管線→DPD→阿含→sonnet 白話/概要/卡→核准無旗標→重建索引/嵌入。

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
git push origin main && echo "✓ $NEXT 已推送，Pages 將自動部署。"
echo "本次完成：$NEXT（成本見上方生成輸出）。"
