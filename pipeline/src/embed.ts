// embed.ts — P9 嵌入（離線語意搜尋用；DATA_PIPELINE §3.1 / §6.4）
// 🔒 build 與 client 同模型同維度（BUILD §1）：Xenova/multilingual-e5-small, dim 384。
// 語意表面 = 中文白話(L2，若已填) + 英文 DPD 釋義（高資源語言當語意表面，非羅馬巴利）。
import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from '@huggingface/transformers';
import type { SuttaFixture } from '@tipitaka/contracts';
import { DATA_DIR, VERSIONS } from './config.ts';
import { ensureDir, writeJson } from './util.ts';

function semanticSurface(seg: SuttaFixture['segments'][number]): string {
  const parts: string[] = [];
  if (seg.vernacular_gloss?.content) parts.push(seg.vernacular_gloss.content);
  const glosses = seg.pali_tokens.map((t) => t.gloss).filter((g): g is string => !!g);
  if (glosses.length) parts.push(glosses.join(', '));
  if (parts.length === 0) parts.push(seg.pali_tokens.map((t) => t.surface).join(' '));
  return parts.join(' ｜ ');
}

export async function buildEmbeddings(suttas: SuttaFixture[]) {
  const ids: string[] = [];
  const texts: string[] = [];
  for (const s of suttas) {
    for (const seg of s.segments) {
      ids.push(seg.segment_id);
      // e5 文件前綴 "passage:"；查詢端用 "query:"（client）
      texts.push('passage: ' + semanticSurface(seg));
    }
  }
  if (ids.length === 0) return { count: 0 };

  const extractor = await pipeline('feature-extraction', VERSIONS.embed_model);
  const dim = VERSIONS.embed_dim;
  const buf = Buffer.alloc(ids.length * dim * 4);

  for (let i = 0; i < texts.length; i++) {
    const out = await extractor(texts[i], { pooling: 'mean', normalize: true });
    const vec = out.data as Float32Array;
    if (vec.length !== dim) throw new Error(`嵌入維度不符：${vec.length} ≠ ${dim}`);
    for (let d = 0; d < dim; d++) buf.writeFloatLE(vec[d], (i * dim + d) * 4);
  }

  ensureDir(DATA_DIR);
  fs.writeFileSync(path.join(DATA_DIR, 'embeddings.bin'), buf);
  writeJson(path.join(DATA_DIR, 'embeddings-meta.json'), {
    model: VERSIONS.embed_model,
    dim,
    dtype: 'float32',
    count: ids.length,
    ids,
    semantic_surface: 'vernacular_gloss+en_gloss',
    query_prefix: 'query: ',
  });
  return { count: ids.length };
}
