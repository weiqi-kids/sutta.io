// questionMap.ts — 佛法問題地圖的主題分類（locale 無關，用 slug 對應）
//
// 為什麼在這裡、而非塞進各 topic JSON：分類是「站點導覽」決定，屬前端 IA，
// 不屬經文內容資料；集中一處避免改 21 個 JSON 與生成管線。
// 新增主題時：把新 slug 歸入下列某類即可；未歸類者會自動落入「更多主題」桶，
// 仍會在 /questions 顯示，不會漏。順序即呈現順序（例如「四念處是什麼」排在「怎麼修」前）。

export interface QCategory {
  id: string;
  zh: string;
  en: string;
  slugs: string[];
}

export const QUESTION_CATEGORIES: QCategory[] = [
  {
    id: 'doctrine',
    zh: '核心教義',
    en: 'Core teachings',
    slugs: [
      'four-noble-truths',
      'noble-eightfold-path',
      'anatta',
      'five-aggregates',
      'dependent-origination',
      'sense-pleasures-danger',
    ],
  },
  {
    id: 'practice',
    zh: '禪修實踐',
    en: 'Meditation & practice',
    slugs: [
      'satipatthana',
      'satipatthana-practice',
      'anapanasati',
      'sati',
      'vipassana',
      'five-hindrances',
    ],
  },
  {
    id: 'life',
    zh: '生活與煩惱',
    en: 'Everyday struggles',
    slugs: ['letting-go', 'calming-angry-thoughts', 'facing-fear', 'facing-criticism', 'marana'],
  },
  {
    id: 'people',
    zh: '人物與入門',
    en: 'People & getting started',
    slugs: ['reading-guide', 'ananda', 'sariputta', 'moggallana'],
  },
];

// 首頁「你想問的是——」精選：跨類挑高流量、初學者最常問的題目。
export const HOME_FEATURED_QUESTIONS = [
  'anatta',
  'five-aggregates',
  'four-noble-truths',
  'satipatthana-practice',
  'anapanasati',
  'letting-go',
  'calming-angry-thoughts',
  'marana',
];

/** 把主題清單依 QUESTION_CATEGORIES 分桶；未歸類者回傳於 leftover，供「更多主題」呈現。 */
export function groupTopics<T extends { slug: string }>(topics: T[]): {
  groups: Array<QCategory & { items: T[] }>;
  leftover: T[];
} {
  const bySlug = new Map(topics.map((tp) => [tp.slug, tp]));
  const used = new Set<string>();
  const groups = QUESTION_CATEGORIES.map((c) => {
    const items = c.slugs.map((s) => bySlug.get(s)).filter(Boolean) as T[];
    items.forEach((tp) => used.add(tp.slug));
    return { ...c, items };
  }).filter((g) => g.items.length > 0);
  const leftover = topics.filter((tp) => !used.has(tp.slug));
  return { groups, leftover };
}

/** 依 slug 陣列取出對應主題，保持給定順序，略過不存在者。 */
export function pickTopics<T extends { slug: string }>(topics: T[], slugs: string[]): T[] {
  const bySlug = new Map(topics.map((tp) => [tp.slug, tp]));
  return slugs.map((s) => bySlug.get(s)).filter(Boolean) as T[];
}
