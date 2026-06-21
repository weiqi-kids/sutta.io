// curate.ts — T5 策展研經問題重排（SEARCH §6c）。
// 固定問題 → build 期嵌入檢索候選 → sonnet 重排 → 固化 data/curated/{sutta}.json。
import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from '@huggingface/transformers';
import { callClaudeStructured } from './claude.ts';
import { T5_SYSTEM, T5_SCHEMA } from './prompts.ts';
import { MODEL } from './tasks.ts';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const DATA_DIR = path.join(ROOT, 'data');
const CONTENT_DIR = path.join(ROOT, 'content');
const EMBED_MODEL = 'Xenova/multilingual-e5-small';

function loadEmbeddings() {
  const meta = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'embeddings-meta.json'), 'utf-8'));
  const bin = fs.readFileSync(path.join(DATA_DIR, 'embeddings.bin'));
  const mat = new Float32Array(bin.buffer, bin.byteOffset, bin.length / 4);
  return { meta, mat };
}

async function main() {
  const suttaIds = (process.env.SUTTAS?.split(',') ?? ['mn10']).map((x) => x.trim());
  const { meta, mat } = loadEmbeddings();
  const snippets = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'snippets.json'), 'utf-8')) as Record<string, { pi: string; zh?: string }>;
  const extractor = await pipeline('feature-extraction', EMBED_MODEL);
  const dim = meta.dim as number;

  for (const sid of suttaIds) {
    const curFile = path.join(CONTENT_DIR, 'curation', `${sid}.json`);
    if (!fs.existsSync(curFile)) continue;
    const cfg = JSON.parse(fs.readFileSync(curFile, 'utf-8')) as { questions: string[] };
    const idsForSutta = (meta.ids as string[]).map((id, i) => ({ id, i })).filter((x) => x.id.startsWith(sid + ':'));

    const out: { questions: any[] } = { questions: [] };
    let cost = 0;
    for (const q of cfg.questions) {
      // 1. 嵌入檢索 top 候選
      const out1 = await extractor('query: ' + q, { pooling: 'mean', normalize: true });
      const qv = out1.data as Float32Array;
      const scored = idsForSutta.map(({ id, i }) => {
        let dot = 0;
        for (let d = 0; d < dim; d++) dot += qv[d] * mat[i * dim + d];
        return { id, dot };
      });
      scored.sort((a, b) => b.dot - a.dot);
      const candidates = scored.slice(0, 12).map((c) => ({
        segment_id: c.id,
        pali: snippets[c.id]?.pi ?? '',
        vernacular_gloss: snippets[c.id]?.zh ?? null,
      }));
      const validSegs = new Set(candidates.map((c) => c.segment_id));

      // 2. sonnet 重排
      const r = callClaudeStructured<{ ranked: { segment_id: string; reason_zh: string }[]; grounded_on: string[] }>(
        T5_SYSTEM, JSON.stringify({ question_zh: q, candidates }), T5_SCHEMA
      );
      if (!r.ok || !r.data) { console.warn(`  「${q}」失敗：${r.error}`); continue; }
      cost += r.costUsd ?? 0;
      const ranked = r.data.ranked.filter((x) => validSegs.has(x.segment_id)); // guardrail：只收候選內
      out.questions.push({ q, ranked, review_status: 'approved', generated_by: MODEL });
      console.log(`  ✓ 「${q}」→ ${ranked.length} 段`);
    }
    fs.mkdirSync(path.join(DATA_DIR, 'curated'), { recursive: true });
    fs.writeFileSync(path.join(DATA_DIR, 'curated', `${sid}.json`), JSON.stringify(out, null, 2) + '\n');
    console.log(`T5 ${sid} 策展完成：${out.questions.length} 題，成本 $${cost.toFixed(2)}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
