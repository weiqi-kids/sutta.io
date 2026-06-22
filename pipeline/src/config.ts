// config.ts — 管線設定與版本鎖定來源（A-5）
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PIPELINE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const ROOT_DIR = path.resolve(PIPELINE_DIR, '..');
export const DATA_DIR = path.join(ROOT_DIR, 'data');
export const VENDOR_DIR = path.join(PIPELINE_DIR, 'vendor');
export const CACHE_DIR = path.join(PIPELINE_DIR, '.cache');

// V1 首發經（A-4：MN 有紮實中阿含平行者）。MN10 Satipaṭṭhāna ↔ MA98 念處經。
export const SUTTAS = (process.env.SUTTAS?.split(',').map((s) => s.trim()).filter(Boolean)) ?? ['mn10'];

// 版本鎖定（A-5）：寫入 manifest，供可重現與回歸（H-2）。
export const VERSIONS = {
  // SuttaCentral bilara-data（published 分支）
  bilara_branch: 'published',
  // dpd-db release tag
  dpd_tag: 'v0.4.20260531',
  // CBETA 年版（中阿含 T26）
  cbeta: 'CBETA 2024.R1',
  // 嵌入模型（build 與 client 須同模型同維度；BUILD §1 🔒）
  embed_model: 'Xenova/multilingual-e5-small',
  embed_dim: 384,
};

// bilara root Pali（巴利原文分段）路徑模板
export function bilaraRootUrl(suttaId: string): string {
  const m = suttaId.match(/^([a-z]+)(\d+)/);
  const collection = m ? m[1] : 'mn';
  return `https://raw.githubusercontent.com/suttacentral/bilara-data/${VERSIONS.bilara_branch}/root/pli/ms/sutta/${collection}/${suttaId}_root-pli-ms.json`;
}

// dpd.db（本機 vendor，gitignore）
export const DPD_DB_PATH = path.join(VENDOR_DIR, 'dpd.db');
export const DPD_DOWNLOAD_URL = `https://github.com/digitalpalidictionary/dpd-db/releases/download/${VERSIONS.dpd_tag}/dpd.db.tar.bz2`;

// 經的中文/巴利標題（V1 小集，手動對照表；之後可由 SC suttaplex 補）
export const SUTTA_TITLES: Record<string, { pali: string; zh: string; collection: string; collection_zh: string }> = {
  mn10: { pali: 'Satipaṭṭhānasutta', zh: '念處經', collection: 'Majjhima Nikāya', collection_zh: '中部' },
  mn1: { pali: 'Mūlapariyāyasutta', zh: '根本法門經', collection: 'Majjhima Nikāya', collection_zh: '中部' },
  // 手動批次 A（2026-06-22）：策展名經，漢譯平行紮實
  mn2: { pali: 'Sabbāsavasutta', zh: '一切漏經', collection: 'Majjhima Nikāya', collection_zh: '中部' },
  mn9: { pali: 'Sammādiṭṭhisutta', zh: '正見經', collection: 'Majjhima Nikāya', collection_zh: '中部' },
  mn22: { pali: 'Alagaddūpamasutta', zh: '蛇喻經', collection: 'Majjhima Nikāya', collection_zh: '中部' },
  mn118: { pali: 'Ānāpānassatisutta', zh: '入出息念經', collection: 'Majjhima Nikāya', collection_zh: '中部' },
  mn141: { pali: 'Saccavibhaṅgasutta', zh: '諦分別經', collection: 'Majjhima Nikāya', collection_zh: '中部' },
};
