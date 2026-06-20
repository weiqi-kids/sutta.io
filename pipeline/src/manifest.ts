// manifest.ts — A-5 版本鎖定（可重現/回歸）。built_at 僅在全域 manifest。
import path from 'node:path';
import { DATA_DIR, VERSIONS } from './config.ts';
import { writeJson } from './util.ts';

export function writeManifest(builtAt: string) {
  writeJson(path.join(DATA_DIR, 'manifest.json'), {
    dpd: VERSIONS.dpd_tag,
    cbeta: VERSIONS.cbeta,
    sc: VERSIONS.bilara_branch,
    embed_model: VERSIONS.embed_model,
    embed_dim: String(VERSIONS.embed_dim),
    built_at: builtAt,
  });
}
