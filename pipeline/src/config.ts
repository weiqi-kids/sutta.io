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

// bilara root Pali（巴利原文分段）路徑模板。
// MN/DN 扁平：sutta/mn/mn10_...；SN/AN 巢狀在相應/集子目錄：sutta/sn/sn56/sn56.11_...
export function bilaraRootUrl(suttaId: string): string {
  const m = suttaId.match(/^([a-z]+)(\d+)/);
  const collection = m ? m[1] : 'mn';
  const dir = suttaId.includes('.') ? `${collection}/${collection}${m ? m[2] : ''}` : collection;
  return `https://raw.githubusercontent.com/suttacentral/bilara-data/${VERSIONS.bilara_branch}/root/pli/ms/sutta/${dir}/${suttaId}_root-pli-ms.json`;
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
  // SN 單經先行（2026-07-03 拍板）：轉法輪經 ↔ 雜阿含379
  'sn56.11': { pali: 'Dhammacakkappavattanasutta', zh: '轉法輪經', collection: 'Saṃyutta Nikāya', collection_zh: '相應部' },
  // L2_BACKFILL（2026-07-05）：補完 10 部有經無白話的經，一併補標題
  mn28: { pali: 'Mahāhatthipadopamasutta', zh: '象跡喻大經', collection: 'Majjhima Nikāya', collection_zh: '中部' },
  mn36: { pali: 'Mahāsaccakasutta', zh: '薩遮迦大經', collection: 'Majjhima Nikāya', collection_zh: '中部' },
  mn38: { pali: 'Mahātaṇhāsaṅkhayasutta', zh: '愛盡大經', collection: 'Majjhima Nikāya', collection_zh: '中部' },
  mn27: { pali: 'Cūḷahatthipadopamasutta', zh: '象跡喻小經', collection: 'Majjhima Nikāya', collection_zh: '中部' },
  mn29: { pali: 'Mahāsāropamasutta', zh: '心材喻大經', collection: 'Majjhima Nikāya', collection_zh: '中部' },
  mn30: { pali: 'Cūḷasāropamasutta', zh: '心材喻小經', collection: 'Majjhima Nikāya', collection_zh: '中部' },
  mn35: { pali: 'Cūḷasaccakasutta', zh: '薩遮迦小經', collection: 'Majjhima Nikāya', collection_zh: '中部' },
  mn32: { pali: 'Mahāgosiṅgasutta', zh: '牛角林大經', collection: 'Majjhima Nikāya', collection_zh: '中部' },
  mn33: { pali: 'Mahāgopālakasutta', zh: '牧牛者大經', collection: 'Majjhima Nikāya', collection_zh: '中部' },
  mn39: { pali: 'Mahāassapurasutta', zh: '馬邑大經', collection: 'Majjhima Nikāya', collection_zh: '中部' },
  mn8: { pali: 'Sallekhasutta', zh: '削減經', collection: 'Majjhima Nikāya', collection_zh: '中部' },
  // MN 書目補名批次（2026-07-08）：26 部原為經號 fallback，補真正中文經名（主對話逐一裁決）
  mn3: { pali: 'Dhammadāyādasutta', zh: '法之繼承人經', collection: 'Majjhima Nikāya', collection_zh: '中部' },
  mn4: { pali: 'Bhayabheravasutta', zh: '怖駭經', collection: 'Majjhima Nikāya', collection_zh: '中部' },
  mn5: { pali: 'Anaṅgaṇasutta', zh: '無穢經', collection: 'Majjhima Nikāya', collection_zh: '中部' },
  mn6: { pali: 'Ākaṅkheyyasutta', zh: '願經', collection: 'Majjhima Nikāya', collection_zh: '中部' },
  mn7: { pali: 'Vatthasutta', zh: '布喻經', collection: 'Majjhima Nikāya', collection_zh: '中部' },
  mn11: { pali: 'Cūḷasīhanādasutta', zh: '師子吼小經', collection: 'Majjhima Nikāya', collection_zh: '中部' },
  mn12: { pali: 'Mahāsīhanādasutta', zh: '師子吼大經', collection: 'Majjhima Nikāya', collection_zh: '中部' },
  mn13: { pali: 'Mahādukkhakkhandhasutta', zh: '苦蘊大經', collection: 'Majjhima Nikāya', collection_zh: '中部' },
  mn14: { pali: 'Cūḷadukkhakkhandhasutta', zh: '苦蘊小經', collection: 'Majjhima Nikāya', collection_zh: '中部' },
  mn15: { pali: 'Anumānasutta', zh: '思量經', collection: 'Majjhima Nikāya', collection_zh: '中部' },
  mn16: { pali: 'Cetokhilasutta', zh: '心荒蕪經', collection: 'Majjhima Nikāya', collection_zh: '中部' },
  mn17: { pali: 'Vanapatthasutta', zh: '林藪經', collection: 'Majjhima Nikāya', collection_zh: '中部' },
  mn18: { pali: 'Madhupiṇḍikasutta', zh: '蜜丸經', collection: 'Majjhima Nikāya', collection_zh: '中部' },
  mn19: { pali: 'Dvedhāvitakkasutta', zh: '雙想經', collection: 'Majjhima Nikāya', collection_zh: '中部' },
  mn20: { pali: 'Vitakkasaṇṭhānasutta', zh: '尋止息經', collection: 'Majjhima Nikāya', collection_zh: '中部' },
  mn21: { pali: 'Kakacūpamasutta', zh: '鋸喻經', collection: 'Majjhima Nikāya', collection_zh: '中部' },
  mn23: { pali: 'Vammikasutta', zh: '蟻垤經', collection: 'Majjhima Nikāya', collection_zh: '中部' },
  mn24: { pali: 'Rathavinītasutta', zh: '傳車經', collection: 'Majjhima Nikāya', collection_zh: '中部' },
  mn25: { pali: 'Nivāpasutta', zh: '撒餌經', collection: 'Majjhima Nikāya', collection_zh: '中部' },
  mn26: { pali: 'Pāsarāsisutta', zh: '聖求經', collection: 'Majjhima Nikāya', collection_zh: '中部' },
  mn31: { pali: 'Cūḷagosiṅgasutta', zh: '牛角林小經', collection: 'Majjhima Nikāya', collection_zh: '中部' },
  mn34: { pali: 'Cūḷagopālakasutta', zh: '牧牛者小經', collection: 'Majjhima Nikāya', collection_zh: '中部' },
  mn37: { pali: 'Cūḷataṇhāsaṅkhayasutta', zh: '愛盡小經', collection: 'Majjhima Nikāya', collection_zh: '中部' },
  mn40: { pali: 'Cūḷaassapurasutta', zh: '馬邑小經', collection: 'Majjhima Nikāya', collection_zh: '中部' },
  mn41: { pali: 'Sāleyyakasutta', zh: '薩羅村婆羅門經', collection: 'Majjhima Nikāya', collection_zh: '中部' },
  mn42: { pali: 'Verañjakasutta', zh: '鞞蘭若村婆羅門經', collection: 'Majjhima Nikāya', collection_zh: '中部' },
};
