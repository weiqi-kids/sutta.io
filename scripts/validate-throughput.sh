#!/bin/bash
# validate-throughput.sh — 用修好的 harness（timeout 900s／批10）續跑補缺段，量測真實吞吐。
# 只跑生成+核准（不 index/embed/build），純測速。記錄每部起訖時間。
set -uo pipefail
export HOME=/root
export PATH="/root/.local/bin:/usr/local/bin:/usr/bin:/bin"
cd /root/sutta.io || exit 1
LOG=pipeline/.cache/throughput.log; exec >>"$LOG" 2>&1
LOCK=/tmp/sutta-daily.lock
[ -e "$LOCK" ] && kill -0 "$(cat "$LOCK" 2>/dev/null)" 2>/dev/null && { echo "lock 佔用，中止"; exit 0; }
echo $$ >"$LOCK"; trap 'rm -f "$LOCK"' EXIT

GAPPED="${GAPPED:-mn6 mn20 mn24 mn5 mn21 mn19 mn14 mn25 mn18 mn12 mn17}"
echo "######## 吞吐驗證開始 $(date '+%F %T') ｜目標：$GAPPED ########"
T0=$(date +%s)
for S in $GAPPED; do
  echo "==== $S 開始 $(date '+%T') ===="
  env SUTTAS="$S" pnpm -C generation exec tsx src/run.ts || echo "$S 生成有錯"
  pnpm -C generation exec tsx src/publish-clean.ts "$S" || echo "$S publish 有錯"
  cov=$(node -e "const d=require('./data/$S.json');const m=d.segments.filter(s=>(s.pali_tokens||[]).some(t=>t.dpd_id!=null||t.lemma));console.log(m.filter(s=>s.vernacular_gloss).length+'/'+m.length)")
  echo "==== $S 完成 $(date '+%T') 覆蓋 $cov ===="
done
T1=$(date +%s)
echo "######## 吞吐驗證結束 $(date '+%F %T')｜總耗時 $(((T1-T0)/60)) 分 ########"
