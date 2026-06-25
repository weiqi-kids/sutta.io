#!/bin/bash
# finish-sutta-retry.sh — 對單部經反覆嘗試 batch，直到 L2 完整或達上限。
# 用於 server 偶發 stall 卡窗時：每隔一段時間重試，draft 會續跑累積，窗清即完成。
# 用法： SUTTA=mn8 [MAX=12] [GAP=1200] scripts/finish-sutta-retry.sh
set -uo pipefail
export HOME=/root
export PATH="/root/.local/bin:/usr/local/bin:/usr/bin:/bin"
REPO=/root/sutta.io; cd "$REPO" || exit 1
SUTTA="${SUTTA:?需 SUTTA=mnX}"; MAX="${MAX:-12}"; GAP="${GAP:-1200}"
LOG="$REPO/pipeline/.cache/finish-$SUTTA.log"; exec >>"$LOG" 2>&1

# 「完整」⟺ 有 summary 且白話覆蓋率 ≥98%（防缺段假完整）。
complete() {
  node -e "
    try{
      const d=require('./data/$SUTTA.json');
      if(!d.summary)process.exit(1);
      const m=d.segments.filter(s=>(s.pali_tokens||[]).some(t=>t.dpd_id!=null||t.lemma));
      const have=m.filter(s=>s.vernacular_gloss).length;
      process.exit(m.length>0 && have/m.length>=0.98 ? 0 : 1);
    }catch(e){process.exit(1)}"
}

echo "===== finish-retry $SUTTA 開始 $(date '+%F %T')（最多 $MAX 次，間隔 ${GAP}s）====="
for i in $(seq 1 "$MAX"); do
  if complete; then echo "✓ $SUTTA 已完整，結束。"; exit 0; fi
  echo "--- 第 $i/$MAX 次嘗試 $(date '+%T') ---"
  NEW="$SUTTA" bash scripts/batch-suttas.sh
  if complete; then echo "✓ $SUTTA 第 $i 次後完整！$(date '+%T')"; exit 0; fi
  echo "未完成，等 ${GAP}s 再試…"; sleep "$GAP"
done
echo "✗ 達上限仍未完成 $SUTTA。$(date '+%T')"; exit 1
