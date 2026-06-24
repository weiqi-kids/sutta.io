#!/bin/bash
# run-all-mn.sh — 全自動把 MN 1..152 全部產到 L2 完整。
# 一波 WAVE 部：fetch→逐部生成+核准→(有進度才)重建索引/嵌入/驗證/build/commit/push。
# 壞窗（server stall）自動等待重試；外圈每波重算未完成清單，故卡住的經會自動回隊重跑。
# 用法： nohup bash scripts/run-all-mn.sh & ；查進度：node scripts/run-all-progress.mjs
set -uo pipefail
export HOME=/root
export PATH="/root/.local/bin:/usr/local/bin:/usr/bin:/bin"
REPO=/root/sutta.io; cd "$REPO" || exit 1
LOG="$REPO/pipeline/.cache/run-all.log"; exec >>"$LOG" 2>&1
LOCK=/tmp/sutta-daily.lock

WAVE="${WAVE:-8}"          # 每波經數
MAX_WAVES="${MAX_WAVES:-60}"
TOTAL="${TOTAL:-152}"       # MN 經數

missing() {
  node -e '
    const fs=require("fs");const T='"$TOTAL"';const o=[];
    for(let i=1;i<=T;i++){const p="data/mn"+i+".json";let ok=false;try{ok=!!JSON.parse(fs.readFileSync(p)).summary}catch{}if(!ok)o.push("mn"+i);}
    process.stdout.write(o.join(" "));'
}
complete() { node -e "try{process.exit(require('./data/$1.json').summary?0:1)}catch(e){process.exit(1)}"; }

echo ""; echo "########## RUN-ALL 開始 $(date '+%F %T') ##########"
waves=0
while [ "$waves" -lt "$MAX_WAVES" ]; do
  REMAIN=($(missing))
  n=${#REMAIN[@]}
  if [ "$n" -eq 0 ]; then echo "✅ 全部 $TOTAL 部完整！$(date '+%F %T')"; break; fi
  WAVELIST=("${REMAIN[@]:0:$WAVE}")
  echo ""; echo "===== 第 $((waves+1)) 波 $(date '+%T')：${WAVELIST[*]}（尚缺 $n 部）====="

  if [ -e "$LOCK" ] && kill -0 "$(cat "$LOCK" 2>/dev/null)" 2>/dev/null; then
    echo "lock 被佔（daily?），等 300s"; sleep 300; continue
  fi
  echo $$ >"$LOCK"

  CSV=$(IFS=,; echo "${WAVELIST[*]}")
  echo "--- fetch L1：$CSV ---"
  env SUTTAS="$CSV" pnpm -C pipeline exec tsx src/run.ts --only=fetch || echo "fetch 有錯，續"

  for S in "${WAVELIST[@]}"; do
    complete "$S" && continue
    echo "--- 生成 $S $(date '+%T') ---"
    env SUTTAS="$S" pnpm -C generation exec tsx src/run.ts || echo "  $S 生成有錯"
    pnpm -C generation exec tsx src/publish-clean.ts "$S" || echo "  $S publish 有錯（可能旗標/壞窗）"
    complete "$S" && echo "  ✓ $S 完整" || echo "  … $S 未完整（回隊下波再試）"
  done

  # 本波是否有任何新完成
  AFTER=($(missing)); done_now=$(( n - ${#AFTER[@]} ))
  echo "本波新完成：$done_now 部（尚缺 ${#AFTER[@]}）"

  if [ "$done_now" -gt 0 ]; then
    ALL=$(ls data/mn*.json | sed 's|data/||;s|\.json||' | paste -sd,)
    env SUTTAS="$ALL" pnpm -C pipeline exec tsx src/run.ts --only=index || echo "index 有錯"
    env SUTTAS="$ALL" pnpm -C pipeline exec tsx src/run.ts --only=embed || echo "embed 有錯"
    if pnpm exec tsx scripts/validate-contract.ts && pnpm -C site build; then
      git add -A
      git commit -q -m "自動規模化：本波 +$done_now 部上線（尚缺 ${#AFTER[@]}）

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>" || echo "無變更可提交"
      git push origin main || echo "push 失敗（下波再推）"
      echo "✓ 第 $((waves+1)) 波已上線 $(date '+%T')"
    else
      echo "✗ 驗證或 build 失敗，本波不提交（保留草稿，下波重來）"
    fi
    rm -f "$LOCK"
  else
    rm -f "$LOCK"
    echo "本波 0 進度（壞窗），等 1200s 再試"; sleep 1200
  fi
  waves=$((waves+1))
done
rm -f "$LOCK"
echo "########## RUN-ALL 結束 $(date '+%F %T')（跑了 $waves 波，尚缺 $(missing | wc -w) 部）##########"
