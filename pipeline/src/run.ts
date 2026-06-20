// run.ts — 管線 orchestrator（P1–P9）。本機 build 期執行，產物寫 data/。
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import type { SuttaFixture } from '@tipitaka/contracts';
import { SUTTAS, DATA_DIR, DPD_DB_PATH, DPD_DOWNLOAD_URL, VENDOR_DIR } from './config.ts';
import { writeJson, readJson, ensureDir } from './util.ts';
import { buildSutta } from './pack.ts';
import { buildIndexes, buildCatalog } from './index.ts';
import { buildEmbeddings } from './embed.ts';
import { writeManifest } from './manifest.ts';

const only = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1];
const runStep = (s: string) => !only || only === s;

function ensureDpdDb() {
  if (fs.existsSync(DPD_DB_PATH)) return;
  console.log('dpd.db 不存在，下載中（177MB，一次性）…');
  ensureDir(VENDOR_DIR);
  execSync(`curl -sL -o "${path.join(VENDOR_DIR, 'dpd.db.tar.bz2')}" "${DPD_DOWNLOAD_URL}"`, { stdio: 'inherit' });
  execSync(`tar xjf "${path.join(VENDOR_DIR, 'dpd.db.tar.bz2')}" -C "${VENDOR_DIR}"`, { stdio: 'inherit' });
}

/** 保留既有 L2（generation 產出），避免重跑管線覆蓋。 */
function mergeExistingL2(suttaId: string, built: SuttaFixture): SuttaFixture {
  const file = path.join(DATA_DIR, `${suttaId}.json`);
  if (!fs.existsSync(file)) return built;
  let prev: SuttaFixture;
  try {
    prev = readJson<SuttaFixture>(file);
  } catch {
    return built;
  }
  const prevGloss = new Map(prev.segments.map((s) => [s.segment_id, s.vernacular_gloss]));
  for (const seg of built.segments) {
    const g = prevGloss.get(seg.segment_id);
    if (g) seg.vernacular_gloss = g;
  }
  if (prev.summary) built.summary = prev.summary;
  if (prev.study_cards?.length) built.study_cards = prev.study_cards;
  return built;
}

async function main() {
  const start = Date.now();
  ensureDir(DATA_DIR);

  if (runStep('dpd')) ensureDpdDb();

  const built: SuttaFixture[] = [];

  if (runStep('fetch') || runStep('dpd')) {
    for (const id of SUTTAS) {
      console.log(`▶ 建置 ${id}（P1 擷取 → P2 斷詞 → P3 DPD join → P4 消歧 → P5 阿含）…`);
      let sutta = await buildSutta(id);
      sutta = mergeExistingL2(id, sutta);
      writeJson(path.join(DATA_DIR, `${id}.json`), sutta);
      const tokN = sutta.segments.reduce((n, s) => n + s.pali_tokens.length, 0);
      const noEntry = sutta.segments.reduce(
        (n, s) => n + s.pali_tokens.filter((t) => t.dpd_id === null).length,
        0
      );
      const ambig = sutta.segments.reduce(
        (n, s) => n + s.pali_tokens.filter((t) => t.ambiguous).length,
        0
      );
      const hasAgama = sutta.passages.some((p) => p.agama != null);
      console.log(
        `  ${sutta.segments.length} segments / ${tokN} tokens（無詞條 ${noEntry}、多解 ${ambig}）｜阿含對照：${hasAgama ? '有' : '無'}`
      );
      built.push(sutta);
    }
  } else {
    // 其他步驟：載入既有 data/*.json
    for (const id of SUTTAS) {
      const file = path.join(DATA_DIR, `${id}.json`);
      if (fs.existsSync(file)) built.push(readJson<SuttaFixture>(file));
    }
  }

  if (runStep('index')) {
    const stats = buildIndexes(built);
    buildCatalog(built);
    console.log(`▶ 索引（P7）：fulltext ${stats.fulltextKeys}、lemma ${stats.lemmaKeys}、surface ${stats.surfaceKeys} 鍵`);
  }

  if (runStep('embed')) {
    console.log('▶ 嵌入（P9）：載入 e5-small（首次下載模型）…');
    const { count } = await buildEmbeddings(built);
    console.log(`  嵌入 ${count} 段 → embeddings.bin`);
  }

  if (!only || only === 'manifest') {
    writeManifest(new Date().toISOString());
  }

  console.log(`✓ 管線完成（${((Date.now() - start) / 1000).toFixed(1)}s）。`);
}

main().catch((e) => {
  console.error('管線失敗：', e);
  process.exit(1);
});
