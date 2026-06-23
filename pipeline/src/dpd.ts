// dpd.ts — P3 DPD join + P4 規則消歧（A-2，LLM 不參與）
// 真實資料：dpd.db。lookup.grammar 提供每個屈折形的 [lemma,pos,morph] 候選。
import Database from 'better-sqlite3';
import type { DpdAnalysis } from '@tipitaka/contracts';
import { DPD_DB_PATH } from './config.ts';
import { dpdLookupKey } from './util.ts';

export interface TokenAnalysis {
  lemma: string | null;
  dpd_id: number | null;
  root: string | null;
  morph: string | null;
  morph_display: string | null;
  compound: string | null;
  gloss: string | null;
  freq: number | null;
  ambiguous: boolean;
  candidates: DpdAnalysis[] | null;
  // B-12 additive enrichment：DPD deconstructor 提供的 sandhi/複合詞切分。
  // 與 dpd_id 正交：sandhi 連音形多半無 headword（dpd_id===null）但仍有切分。
  // 形狀：候選切分清單，每候選為切分後的構詞片段陣列。無則 null。
  // 例：surface "Kathañca" → [["kathaṃ","ca"]]；多義 "patimā" → [["pata","imā"],["pati","amā"],...]
  deconstruction: string[][] | null;
}

let db: Database.Database | null = null;
export function openDpd(): Database.Database {
  if (!db) {
    db = new Database(DPD_DB_PATH, { readonly: true, fileMustExist: true });
  }
  return db;
}

// morph 原始碼 → 人讀（build 期解碼，前端只渲染 morph_display；STUDY_PAGE §8.1）
const DECODE: Record<string, string> = {
  // 詞性
  noun: '名詞', adj: '形容詞', pron: '代名詞', pp: '過去分詞', prp: '現在分詞',
  ptp: '未來被動分詞', ind: '不變詞', verb: '動詞', abs: '連續體', inf: '不定詞',
  ger: '動名詞', card: '基數詞', ordin: '序數詞', root: '字根', sandhi: '連音',
  idiom: '慣用語', suffix: '語尾', prefix: '接頭', fut: '未來分詞', cs: '使役',
  // 性
  masc: '陽性', fem: '陰性', nt: '中性',
  // 格
  nom: '主格', acc: '對格', instr: '具格', dat: '與格', abl: '從格',
  gen: '屬格', loc: '處格', voc: '呼格',
  // 數
  sg: '單數', pl: '複數', dual: '雙數',
  // 人稱
  '1st': '第一人稱', '2nd': '第二人稱', '3rd': '第三人稱',
  // 時/態/語氣
  pr: '現在式', aor: '不定過去式', imp: '命令式', opt: '願望式', cond: '條件式',
  imperf: '未完成式', perf: '完成式', futi: '未來式', reflx: '反身', caus: '使役',
  pass: '被動', act: '主動', deno: '名動詞', desid: '意欲',
  // 比較
  comp: '比較級', super: '最高級',
};

function decodeMorph(pos: string, morphStr: string): string {
  const parts: string[] = [];
  const posZh = DECODE[pos];
  if (posZh) parts.push(posZh);
  for (const tok of morphStr.split(/\s+/).filter(Boolean)) {
    const zh = DECODE[tok];
    parts.push(zh ?? tok); // 未知碼誠實透出原碼，不臆測
  }
  return parts.join('·');
}

function cleanLemma(lemma_1: string): string {
  return lemma_1.replace(/\s+\d+(\.\d+)?$/, '').trim();
}
function cleanRoot(root_key: string): string | null {
  const r = root_key.replace(/\s+\d+$/, '').trim();
  return r || null;
}

interface HeadwordRow {
  id: number;
  lemma_1: string;
  pos: string;
  root_key: string;
  meaning_1: string;
  meaning_lit: string;
  compound_construction: string;
  construction: string;
  ebt_count: number;
}

// B-12：解析 DPD deconstructor 欄（JSON 字串）→ 候選切分清單。
// 原始格式：'["yad + idaṃ"]' 或多義 '["pata + imā", "pati + amā"]'；空為 '' 或 '[]'。
// 回傳 string[][]（每候選切成片段）或 null（無切分）。
function parseDeconstructor(raw: string | null | undefined): string[][] | null {
  if (!raw) return null;
  let arr: unknown;
  try {
    arr = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const splits: string[][] = [];
  for (const cand of arr) {
    if (typeof cand !== 'string') continue;
    const parts = cand.split('+').map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) splits.push(parts); // 至少兩段才算切分
  }
  return splits.length > 0 ? splits : null;
}

export function analyzeSurface(surface: string): TokenAnalysis {
  const d = openDpd();
  const key = dpdLookupKey(surface);
  const NONE: TokenAnalysis = {
    lemma: null, dpd_id: null, root: null, morph: null, morph_display: null,
    compound: null, gloss: null, freq: null, ambiguous: false, candidates: null,
    deconstruction: null,
  };
  if (!key) return NONE;

  const row = d
    .prepare('SELECT headwords, grammar, deconstructor FROM lookup WHERE lookup_key = ?')
    .get(key) as { headwords: string; grammar: string; deconstructor: string } | undefined;
  if (!row) return NONE;

  // B-12：切分與 headword/grammar 正交，先算好，所有回傳路徑都帶上。
  const deconstruction = parseDeconstructor(row.deconstructor);

  let headwordIds: number[] = [];
  try {
    headwordIds = JSON.parse(row.headwords || '[]');
  } catch {
    headwordIds = [];
  }
  let grammarList: [string, string, string][] = [];
  try {
    grammarList = row.grammar ? JSON.parse(row.grammar) : [];
  } catch {
    grammarList = [];
  }

  // 查無 headword 且無 grammar → DPD 未收錄此詞（dpd_id null 主訊號）。
  // 但 sandhi 連音形常落此路徑卻仍有切分 → 仍帶上 deconstruction（additive）。
  if (headwordIds.length === 0 && grammarList.length === 0) return { ...NONE, deconstruction };

  const hwStmt = d.prepare(
    'SELECT id, lemma_1, pos, root_key, meaning_1, meaning_lit, compound_construction, construction, ebt_count FROM dpd_headwords WHERE id = ?'
  );
  const headwords = new Map<number, HeadwordRow>();
  for (const id of headwordIds) {
    const hw = hwStmt.get(id) as HeadwordRow | undefined;
    if (hw) headwords.set(id, hw);
  }

  const resolveHeadword = (gLemma: string, gPos: string): HeadwordRow | null => {
    let best: HeadwordRow | null = null;
    for (const hw of headwords.values()) {
      const lc = cleanLemma(hw.lemma_1);
      if (lc === gLemma && hw.pos === gPos) return hw; // 精確 lemma+pos
      if (lc === gLemma && !best) best = hw; // 退而求其次：lemma 相符
    }
    return best ?? headwords.values().next().value ?? null;
  };

  const scored: { a: DpdAnalysis; freq: number }[] = [];
  const seen = new Set<string>();

  const pushAnalysis = (gLemma: string, gPos: string, morphStr: string) => {
    const hw = resolveHeadword(gLemma, gPos);
    const dpd_id = hw ? hw.id : null;
    const root = hw ? cleanRoot(hw.root_key) : null;
    const compound = hw && hw.compound_construction ? hw.compound_construction : row.deconstructor || null;
    const gloss = hw ? hw.meaning_1 || hw.meaning_lit || null : null;
    const morph = `${gPos}${morphStr ? ' ' + morphStr : ''}`.trim();
    const morph_display = decodeMorph(gPos, morphStr);
    const dedupeKey = `${gLemma}|${dpd_id}|${morph}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    scored.push({
      a: { lemma: gLemma, dpd_id, root, morph, morph_display, compound: compound || null, gloss },
      freq: hw ? hw.ebt_count : 0,
    });
  };

  if (grammarList.length > 0) {
    for (const [gLemma, gPos, morphStr] of grammarList) pushAnalysis(gLemma, gPos, morphStr ?? '');
  } else {
    // 不變詞等：grammar 空，由 headword pos 推
    for (const hw of headwords.values()) {
      pushAnalysis(cleanLemma(hw.lemma_1), hw.pos, '');
    }
  }

  if (scored.length === 0) return { ...NONE, deconstruction };

  // 規則 a（A-2）：偏好高頻解析。穩定排序（freq 降冪，原序為次）；不決則標多解保留全部候選。
  const indexed = scored.map((s, i) => ({ ...s, i }));
  indexed.sort((x, y) => (y.freq - x.freq) || (x.i - y.i));
  const analyses = indexed.map((s) => s.a);
  const chosen = analyses[0];
  const ambiguous = analyses.length > 1;
  // candidates =「其餘候選」（排除 chosen），上限 6 以控產物大小（popover 展開用）
  const rest = ambiguous ? analyses.slice(1, 7) : null;
  return {
    lemma: chosen.lemma,
    dpd_id: chosen.dpd_id,
    root: chosen.root,
    morph: chosen.morph,
    morph_display: chosen.morph_display,
    compound: chosen.compound,
    gloss: chosen.gloss,
    freq: indexed[0].freq || null,
    ambiguous,
    candidates: rest,
    deconstruction,
  };
}
