#!/usr/bin/env bash
# sutta.io 資料層（每日）— 比照 folk.tw seo-collect-cron.sh + 資料心跳。
# 做的事（全程非 LLM）：為「下一批還沒 L1 的經」建 L1（巴利/DPD/斷詞/阿含）→ 算覆蓋指標 →
#   寫 data/daily-snapshot/<台灣日期>.json → 發 📡 到 Slack。不 commit、不 push（交大腦層處理）。
# crontab（台灣 02:00 = UTC 18:00）：0 18 * * * /root/sutta.io/scripts/daily-data-layer.sh >> /root/sutta.io/pipeline/.cache/data-layer.log 2>&1
set -uo pipefail
export PATH="/root/.local/bin:/usr/local/bin:/usr/bin:/bin"
export TZ="Asia/Taipei"

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO" || exit 1
DATE="$(date +%F)"
CHANNEL="C0BCK9N8SSX"   # #原典-sutta-io
SLACK_NOTIFY="$REPO/scripts/slack-notify.sh"
PREP="${L1_PREP_COUNT:-6}"   # 每日預備幾部 L1（資料備料，非生成配額）
mkdir -p data/daily-snapshot pipeline/.cache

echo "===== [data-layer] $DATE $(date '+%T %Z') 開始 ====="

# 1) 找出下一批「還沒 L1」的 MN 經（無 data/mnN.json），取前 PREP 部。
TARGETS="$(node -e '
  const fs=require("fs");const T=152;const out=[];
  for(let i=1;i<=T && out.length<'"$PREP"';i++){ if(!fs.existsSync("data/mn"+i+".json")) out.push("mn"+i); }
  process.stdout.write(out.join(","));
')"

# 2) 建 L1（非 LLM）。
if [ -n "$TARGETS" ]; then
  echo "[data-layer] fetch L1：$TARGETS"
  SUTTAS="$TARGETS" pnpm -C pipeline exec tsx src/run.ts --only=fetch 2>&1 | tail -20 || echo "[data-layer] fetch 有錯（續行回報）"
else
  echo "[data-layer] 所有 MN 經皆已有 L1，今日無新備料。"
fi

# 3) 算指標 + 寫 snapshot + 組訊息（node 印出 Slack 文字到 stdout）。
MSG="$(node -e '
const fs=require("fs");
const DATE="'"$DATE"'";
const targets="'"$TARGETS"'".split(",").filter(Boolean);
const ids=[]; for(let i=1;i<=152;i++){ if(fs.existsSync("data/mn"+i+".json")) ids.push("mn"+i); }
function metrics(id){
  const d=JSON.parse(fs.readFileSync("data/"+id+".json","utf-8"));
  const segs=d.segments||[];
  let tok=0,noEntry=0,amb=0;
  for(const s of segs){ for(const t of (s.pali_tokens||[])){ if(t.dpd_id!=null||t.lemma){ tok++; if(t.dpd_id==null) noEntry++; if(t.ambiguous) amb++; } } }
  const agama=(d.passages||[]).some(p=>p.agama!=null);
  return {id, segs:segs.length, tok, noEntry, amb, agama};
}
const fetched=targets.filter(id=>fs.existsSync("data/"+id+".json")).map(metrics);
// 全站覆蓋
let withL1=ids.length, complete=0, totalSeg=0;
for(const id of ids){ const d=JSON.parse(fs.readFileSync("data/"+id+".json","utf-8"));
  const m=d.segments.filter(s=>(s.pali_tokens||[]).some(t=>t.dpd_id!=null||t.lemma));
  totalSeg+=m.length; const have=m.filter(s=>s.vernacular_gloss).length;
  if(d.summary&&m.length&&have/m.length>=0.98) complete++;
}
const snap={date:DATE, fetched, overall:{withL1, complete, total:152, totalSeg}};
fs.writeFileSync("data/daily-snapshot/"+DATE+".json", JSON.stringify(snap,null,2)+"\n");
// Slack 訊息（mrkdwn）
const md=DATE.slice(5).replace("-","/");
let m=`📡 *sutta.io 資料層 · ${md}*（本機自動產出，純資料不含 AI）\n\n`;
m+=`【今日備料 L1（巴利原文＋DPD＋斷詞＋阿含對照）】\n`;
if(fetched.length){
  for(const f of fetched){ m+=`・${f.id}：${f.segs} 段・${f.tok} 詞（無詞條 ${f.noEntry}・多解 ${f.amb}）・阿含對照 ${f.agama?"有":"無"}\n`; }
}else{ m+=`・今日無新經需備料（MN 全部已有 L1）\n`; }
m+=`\n【資料層覆蓋總況】\n`;
m+=`・已有 L1 的經：${withL1}/152 部\n`;
m+=`・白話已達真完整（≥98%）：${complete}/152 部\n`;
m+=`・累計可解析段落：${totalSeg} 段\n`;
m+=`\n📄 完整數據：data/daily-snapshot/${DATE}.json`;
process.stdout.write(m);
')"

# 4) 發 Slack（失敗不中斷）。
printf '%s' "$MSG" | "$SLACK_NOTIFY" "$CHANNEL" || echo "[data-layer] Slack 發送失敗（查 token/頻道）"
echo "===== [data-layer] $DATE $(date '+%T %Z') 結束 ====="
