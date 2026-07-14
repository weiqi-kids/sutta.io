// 本機產每頁專屬 OG 金句卡 → PNG 寫進 site/public/og/，commit 進 repo（CI 純靜態服務，不渲染、不依賴字型）。
// 內容治理：主題頁金句為「人工精選、且強制驗證為該頁文字連續子字串」的原句；研經頁用概要首句。任何非子字串即 throw，硬防捏造。
// 用法（cwd=site）：node scripts/gen-og-cards.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderQuoteCard } from './quote-card.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');           // repo 根
const TOPICS_DIR = path.join(ROOT, 'content/topics');
const DATA_DIR = path.join(ROOT, 'data');
const OUT_DIR = path.join(HERE, '..', 'public/og');   // site/public/og

// 主題頁精選金句（kicker＝讀者的問題脈絡；quote＝逐字取自該頁 definition/段落；source＝經名）。
// quote 會在下方強制檢查為該頁文字的連續子字串。
const TOPIC = {
  'facing-fear':          { kicker: '害怕、恐懼的時候', quote: '維持那個姿勢，不換、不逃，一直待到把它看透、驅除為止', source: '《怖駭經》中部 4' },
  'calming-angry-thoughts':{ kicker: '負面念頭停不下來', quote: '由溫和到強硬層層遞進，前一個方法奏效就不必用到後面，終點是對自己的念頭得自在', source: '《息止尋念經》中部 20' },
  'facing-criticism':     { kicker: '被批評、毀謗時', quote: '心不改變、不出惡語、懷慈心而住', source: '《鋸喻經》中部 21' },
  'letting-go':           { kicker: '怎麼放下執著、煩惱', quote: '不是壓住念頭，也不是斷絕感情，而是先認出眼前的煩惱屬於哪一類，再選對應的手段', source: '《一切漏經》中部 2' },
  'sense-pleasures-danger':{ kicker: '慾望為何帶來痛苦', quote: '佛陀給的出路不是壓抑或自我折磨，而是「出離」', source: '《大苦蘊經》中部 13' },
  'anatta':               { kicker: '無我是什麼意思', quote: '色、受、想、行、識等一切可經驗的現象皆無常、會變易', source: '《蛇喻經》中部 22' },
  'anapanasati':          { kicker: '安般念是什麼', quote: '先安頓身體與呼吸，再處理感受、調御內心，最後以觀慧透視現象的本質', source: '《入出息念經》中部 118' },
  'satipatthana-practice':{ kicker: '四念處怎麼修', quote: '以精勤、正知、具念，如實隨觀當下的經驗，捨除對世間的貪憂', source: '《念處經》中部 10' },
  'satipatthana':         { kicker: '四念處是什麼', quote: '念的四種安住處：身、受、心、法', source: '《念處經》中部 10' },
  'sati':                 { kicker: '正念是什麼', quote: '正念（sati）本義是「憶念、不忘失」，指讓心對當前所緣持續現前的能力', source: '正念・sati' },
  'noble-eightfold-path': { kicker: '八正道是什麼', quote: '由正見、正思惟、正語、正業、正命、正精進、正念、正定八支構成', source: '《諦分別經》中部 141' },
  'four-noble-truths':    { kicker: '四聖諦是什麼', quote: '集聖諦指明苦的起因是渴愛，滅聖諦是渴愛的無餘止息', source: '四聖諦・轉法輪經' },
  'dependent-origination':{ kicker: '十二因緣是什麼', quote: '前支集起則後支集起，前支滅盡則後支滅盡', source: '緣起・十二因緣' },
  'five-aggregates':      { kicker: '五蘊是什麼', quote: '對這五者的執取——五取蘊——簡言之即是苦', source: '五蘊・pañcakkhandhā' },
  'five-hindrances':      { kicker: '五蓋是什麼', quote: '遮蔽、障礙心的五種狀態：貪欲蓋、瞋恚蓋、惛沉睡眠蓋、掉舉惡作蓋、疑蓋', source: '《蟻垤經》中部 23' },
  'marana':               { kicker: '至親離世、走不出來時', quote: '悲傷之所以這麼重，正因為那個人對你這麼重要', source: '《愛生經》中部 87' },
  'vipassana':            { kicker: '內觀是什麼', quote: '指如實觀見身心現象的生起與滅去', source: '內觀・vipassanā' },
  'reading-guide':        { kicker: '巴利經典入門', quote: '巴利經典入門不必按經號從頭讀：依目的選起點更有效', source: '入門指南' },
  'ananda':               { kicker: '阿難是誰', quote: '此後二十五年常隨佛陀身邊，參與眾多開示', source: '原典中的阿難' },
  'sariputta':            { kicker: '舍利弗是誰', quote: '他與摯友目犍連一同出家，不久證悟，常獲佛陀讚歎', source: '舍利弗的一生' },
  'moggallana':           { kicker: '目犍連是誰', quote: '受戒後第七天證得阿羅漢，以神通第一著稱', source: '目犍連的一生' },
};

const norm = (s) => String(s).replace(/\s+/g, '');
function pageText(zh) {
  const parts = [zh.question, zh.definition, ...(zh.sections ?? []).flatMap((s) => s.paragraphs ?? [])];
  return norm(parts.join('　'));
}

function ensureDir(d) { fs.mkdirSync(d, { recursive: true }); }
let ok = 0, fail = 0;

// —— 主題頁 ——
ensureDir(path.join(OUT_DIR, 'topics'));
for (const [slug, card] of Object.entries(TOPIC)) {
  const file = path.join(TOPICS_DIR, `${slug}.json`);
  if (!fs.existsSync(file)) { console.error(`✗ 缺主題檔 ${slug}`); fail++; continue; }
  const zh = JSON.parse(fs.readFileSync(file, 'utf8')).zh;
  // 硬防捏造：金句必須是該頁文字的連續子字串
  if (!pageText(zh).includes(norm(card.quote))) {
    console.error(`✗ ${slug}：金句非該頁原文子字串（防捏造攔截）→ ${card.quote}`);
    fail++; continue;
  }
  const png = renderQuoteCard({ kicker: card.kicker, quote: card.quote, source: card.source, tone: 'cool' });
  fs.writeFileSync(path.join(OUT_DIR, 'topics', `${slug}.png`), png);
  ok++;
}
// 檢查有無主題頁漏做卡
for (const f of fs.readdirSync(TOPICS_DIR)) {
  const slug = f.replace('.json', '');
  if (!TOPIC[slug]) console.warn(`… 主題 ${slug} 尚無精選金句，未產卡（之後補）`);
}

// —— 研經頁：用概要首句（逐字，概要為既有 L2 內容）——
ensureDir(path.join(OUT_DIR, 'read'));
const suttas = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'suttas.json'), 'utf8'));
for (const [id, meta] of Object.entries(suttas)) {
  const sid = meta.id || id;
  const dfile = path.join(DATA_DIR, `${sid}.json`);
  if (!fs.existsSync(dfile)) continue;
  const d = JSON.parse(fs.readFileSync(dfile, 'utf8'));
  const content = d.summary?.content;
  if (!content) { console.warn(`… ${sid} 無概要，跳過`); continue; }
  const firstSentence = content.split(/(?<=。)/)[0].slice(0, 60);
  const nameZh = /^[a-z]/i.test(meta.title_zh || '') || (meta.title_zh || '') === sid ? '' : meta.title_zh;
  const n = sid.replace(/^mn/, '中部 ').replace(/^sn/, '相應部 ');
  const source = nameZh ? `《${nameZh}》${n}` : n;
  const png = renderQuoteCard({ kicker: '逐句白話對照', quote: firstSentence, source, tone: 'warm' });
  fs.writeFileSync(path.join(OUT_DIR, 'read', `${sid}.png`), png);
  ok++;
}

// —— 今日一句：池中每則生一張卡（白話逐字取自 data，天然守防捏造）——
const DAILY_POOL = path.join(ROOT, 'content/daily/verses.json');
if (fs.existsSync(DAILY_POOL)) {
  ensureDir(path.join(OUT_DIR, 'daily'));
  const pool = JSON.parse(fs.readFileSync(DAILY_POOL, 'utf8'));
  for (const e of pool) {
    const dfile = path.join(DATA_DIR, `${e.sutta}.json`);
    if (!fs.existsSync(dfile)) { console.warn(`… 今日一句 ${e.segment_id}：無 ${e.sutta} 資料，跳過`); continue; }
    const d = JSON.parse(fs.readFileSync(dfile, 'utf8'));
    const seg = (d.segments || []).find((s) => s.segment_id === e.segment_id);
    const vg = seg?.vernacular_gloss;
    if (!vg || vg.review_status !== 'approved' || !vg.content) {
      console.warn(`… 今日一句 ${e.segment_id}：白話缺或未校稿，跳過`); continue;
    }
    const nameZh = d.sutta?.title_zh || '';
    const coll = d.sutta?.collection_zh || d.sutta?.collection || '';
    const source = nameZh ? `《${nameZh}》${coll}` : coll;
    const slug = e.segment_id.replace(/[:.]/g, '-');
    const png = renderQuoteCard({ kicker: e.kicker || '今日一句', quote: vg.content, source, tone: 'warm' });
    fs.writeFileSync(path.join(OUT_DIR, 'daily', `${slug}.png`), png);
    ok++;
  }
}

console.log(`OG 卡產生完成：${ok} 張${fail ? `，${fail} 張失敗` : ''}`);
if (fail) process.exit(1);
