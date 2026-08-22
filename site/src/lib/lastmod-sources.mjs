// sitemap <lastmod> 的來源解析。給 astro.config.mjs 的 serialize 用。
//
// 為什麼要這一支：本站 2,858 個網址裡只有 22 個拿得到 lastmod——靜態頁與少數逐經頁。
// 其餘 2,836 頁（2,682 個 /lexicon/、42 個 /topics/、66 個 /agama/、46 個 /read/）
// 是從資料檔產生的，沒有一頁一檔的原始碼可以取 git 日期。
//
// 🔴 但「沒有一頁一檔」不等於「算不出逐頁日期」。這裡對每一類分別找出**真實**的來源：
//   /topics/<slug>/   → content/topics/<slug>.json 的 git 日期（一頁一檔，直接可取）
//   /agama|nikaya|read/<id>/ → 該經自己的資料檔（content/context/、data/curated/、data/）
//   /lexicon/<key>/   → **逐條**從 data/lexicon.json 的 git 歷史算出來
//
// 最後那條是重點。整份 lexicon.json 只有 15 個版本、5,546 個詞條，
// 所以可以走一次歷史、比對每個 key 的值在哪一個 commit 真的變了。
// 這樣 2,682 頁拿到的是各自的日期，而不是「整份檔案的日期」——後者會在改一個詞條時
// 讓 2,681 個沒變的頁跟著宣稱更新，那正是 Google 說的「lastmod 不準就整個忽略」。
//
// 一律取 git commit 日期，**絕不用 build 時間**；對不到來源就回 null 讓呼叫端留白。
// ⚠️ CI 的 checkout 必須 fetch-depth: 0（見 .github/workflows/deploy.yml）。

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const run = (root, args) => {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 });
  } catch { return null; }
};

const fileDate = (root, rel) => (run(root, ['log', '-1', '--format=%cs', '--', rel]) || '').trim() || null;

/**
 * 逐 key 算出「這個 key 的值最後一次改變是哪個 commit 的日期」。
 * 走訪順序由舊到新，值變了才更新該 key 的日期——所以拿到的是**該條目自己的**更新日，
 * 不是整份檔案的更新日。
 */
function perKeyDates(root, relPath) {
  const log = run(root, ['log', '--format=%H %cs', '--reverse', '--', relPath]);
  if (!log) return new Map();
  const revs = log.trim().split('\n').filter(Boolean).map((l) => {
    const i = l.indexOf(' ');
    return { sha: l.slice(0, i), date: l.slice(i + 1).trim() };
  });
  const out = new Map();
  let prev = null;
  for (const { sha, date } of revs) {
    const raw = run(root, ['show', `${sha}:${relPath}`]);
    if (!raw) continue;
    let obj;
    try { obj = JSON.parse(raw); } catch { continue; }
    if (!obj || typeof obj !== 'object') continue;
    for (const [k, v] of Object.entries(obj)) {
      const s = JSON.stringify(v);
      if (!prev || prev.get(k) !== s) out.set(k, date);
    }
    prev = new Map(Object.entries(obj).map(([k, v]) => [k, JSON.stringify(v)]));
  }
  return out;
}

/**
 * `/agama/ma<N>/` 是**彙整頁**：由所有「passages 裡引到中阿含 N」的經文檔聚合而成。
 * 所以它的 lastmod ＝ 那幾個來源經文檔裡最新的一個。掃一次建表，不逐頁重算。
 * （ref 形如 `T01n0026 中阿含98 念處經`，判準與 site/src/lib/agama.ts 的 listAgama 一致。）
 */
function agamaSources(root, listFiles) {
  const map = new Map();   // maId → [相對路徑…]
  for (const rel of listFiles) {
    let obj;
    try { obj = JSON.parse(readFileSync(join(root, rel), 'utf-8')); } catch { continue; }
    for (const psg of obj?.passages ?? []) {
      const ref = psg?.agama?.ref;
      if (typeof ref !== 'string') continue;
      const m = ref.match(/中阿含\s*(\d+)/);
      if (!m) continue;
      const id = `ma${parseInt(m[1], 10)}`;
      map.set(id, [...(map.get(id) ?? []), rel]);
    }
  }
  return map;
}

/** 多來源取最新（詞條頁同時吃 lexicon／entities／usage）。 */
const newest = (...ds) => ds.filter(Boolean).sort().pop() ?? null;

export function createLastmodResolver(root) {
  // 逐 key 的日期只算一次，build 期間重複使用。
  // 版控裡的經文檔（排除索引／向量／字典等非逐經資料）
  const suttaFiles = (run(root, ['ls-files', 'data/*.json', 'fixtures/*.json']) || '')
    .split('\n').filter((f) => f && !/embeddings|entities|index-|lexicon|manifest|usage|daily-snapshot|l2-draft/.test(f));
  const agamaMap = agamaSources(root, suttaFiles);

  const lexDates = perKeyDates(root, 'data/lexicon.json');
  const entDates = perKeyDates(root, 'data/entities.json');
  const useDates = perKeyDates(root, 'data/usage.json');

  const pageCache = new Map();
  const cachedFileDate = (rel) => {
    if (!pageCache.has(rel)) pageCache.set(rel, fileDate(root, rel));
    return pageCache.get(rel);
  };
  const firstExisting = (cands) => cands.find((c) => existsSync(join(root, c))) ?? null;

  return (pathname) => {
    let p;
    try { p = decodeURIComponent(pathname); } catch { return null; }
    p = p.replace(/^\/en(?=\/|$)/, '').replace(/^\/|\/$/g, '');   // /en/ 是中文內容的英文殼

    // 1) 靜態頁：一頁一檔
    const staticFile = firstExisting(p === ''
      ? ['site/src/pages/index.astro']
      : [`site/src/pages/${p}.astro`, `site/src/pages/${p}/index.astro`]);
    if (staticFile) return cachedFileDate(staticFile);

    // 2) 詞條頁：逐 key 從 git 歷史算出來的日期
    const lex = p.match(/^lexicon\/(.+)$/);
    if (lex) {
      const k = lex[1];
      return newest(lexDates.get(k), entDates.get(k), useDates.get(k));
    }

    // 3) 主題頁：一頁一檔
    const topic = p.match(/^topics\/(.+)$/);
    if (topic) {
      const f = firstExisting([`content/topics/${topic[1]}.json`]);
      return f ? cachedFileDate(f) : null;
    }

    // 4) 中阿含彙整頁：取所有來源經文檔裡最新的一個
    const ma = p.match(/^agama\/(ma\d+)$/);
    if (ma) {
      const srcs = agamaMap.get(ma[1]) ?? [];
      return srcs.length ? newest(...srcs.map(cachedFileDate)) : null;
    }

    // 5) 經文頁：該經自己的資料檔
    const sutta = p.match(/^(?:agama|nikaya|read)\/([^/]+)$/);
    if (sutta) {
      const id = sutta[1];
      const f = firstExisting([
        `content/context/${id}.json`,
        `data/curated/${id}.json`,
        `data/${id}.json`,
        `fixtures/${id}.json`,
      ]);
      return f ? cachedFileDate(f) : null;
    }

    // 6) 對不到 → 留白（絕不退回 build 時間）
    return null;
  };
}
