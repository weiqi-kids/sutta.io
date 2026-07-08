// agama.ts — 中阿含（Madhyama Āgama, T26）自有落地頁的資料層。
// 純用既有 CBETA 正典資料（passages[].agama），反轉出「中阿含 → 對應中部」清單。
// 不生成內容、不改經文。獨立於 data.ts（僅 import，不編輯）。
import { listSuttas, getSutta } from './data';

/** 對應到某部中阿含的一部巴利中部經。 */
export interface AgamaSuttaLink {
  /** 中部經 id，如 "mn22"（深連結 /read/{id}） */
  id: string;
  /** 中部經號，如 22 */
  n: number;
  title_zh: string;
  title_pali: string;
}

export interface AgamaEntry {
  /** 落地頁 id，如 "ma200" */
  maId: string;
  /** 中阿含經號，如 200 */
  maNum: number;
  /** 中阿含經名，如 "阿梨吒經" */
  maTitle: string;
  /** 原始 CBETA ref，如 "T01n0026 中阿含200 阿梨吒經" */
  ref: string;
  /** 漢譯正文（保留段落；多段來源則合併） */
  text: string;
  /** 對應的中部經（通常一部；同一部中阿含偶對多部中部，如 ma101） */
  suttas: AgamaSuttaLink[];
  /** 主要對應中部（經號最小者）——供概述句與相容欄位 */
  suttaId: string;
  suttaTitleZh: string;
}

const suttaNum = (id: string): number => parseInt(id.replace(/\D/g, ''), 10);

/**
 * 反轉正典資料，列出所有「有中阿含平行」的落地頁。
 * 僅處理中阿含（ref 含「中阿含」）；雜阿含 SA／增一阿含 AA 先略過。
 */
export function listAgama(): AgamaEntry[] {
  const byNum = new Map<number, AgamaEntry>();
  for (const s of listSuttas()) {
    const fx = getSutta(s.id);
    if (!fx) continue;
    for (const p of fx.passages) {
      const a = p.agama;
      if (!a?.ref) continue;
      // 只取中阿含（T26）；ref 形如 "T01n0026 中阿含200 阿梨吒經"
      const m = a.ref.match(/中阿含\s*(\d+)\s*(\S+)/);
      if (!m) continue;
      const maNum = parseInt(m[1], 10);
      const maTitle = m[2];
      const link: AgamaSuttaLink = {
        id: s.id,
        n: suttaNum(s.id),
        title_zh: s.title_zh,
        title_pali: s.title_pali,
      };
      const existing = byNum.get(maNum);
      if (existing) {
        if (!existing.suttas.some((x) => x.id === s.id)) existing.suttas.push(link);
        // 同一部中阿含若跨 passage 有不同正文，保留較長者（一般相同）
        const text = (a.text ?? '').trim();
        if (text && !existing.text.includes(text) && text.length > existing.text.length) {
          existing.text = text;
        }
      } else {
        byNum.set(maNum, {
          maId: `ma${maNum}`,
          maNum,
          maTitle,
          ref: a.ref,
          text: (a.text ?? '').trim(),
          suttas: [link],
          suttaId: s.id,
          suttaTitleZh: s.title_zh,
        });
      }
    }
  }
  const list = [...byNum.values()];
  for (const e of list) {
    e.suttas.sort((x, y) => x.n - y.n);
    e.suttaId = e.suttas[0].id;
    e.suttaTitleZh = e.suttas[0].title_zh;
  }
  list.sort((a, b) => a.maNum - b.maNum);
  return list;
}

/** 反向索引：中部經 id → 其對應的中阿含落地頁（總表加「看中阿含原文」連結用）。 */
export function agamaBySuttaId(): Map<string, AgamaEntry> {
  const m = new Map<string, AgamaEntry>();
  for (const e of listAgama()) {
    for (const s of e.suttas) m.set(s.id, e);
  }
  return m;
}

/** 將漢譯正文切成段落（CBETA 以空行分段）。供頁面可讀排版。 */
export function agamaParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((s) => s.replace(/\n/g, '').trim())
    .filter(Boolean);
}
