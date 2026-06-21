// world.zh-Hant.ts — 「早期佛典的世界」內容（CONTEXT §5.1 / SOURCING_STANDARD）
// 鐵則：絕對年代不寫死、爭議並陳不裁決、他派客觀並陳；每條帶四級出處。
// 內容備料（J-8 具名學界引用）為持續工作；此處放可靠錨點（經內名單=canonical、廣泛接受框架=scholarly 標爭議）。
import type { SourcedFact } from '@tipitaka/contracts';

export interface WorldSection {
  key: string;
  title: string;
  facts: SourcedFact[];
}

export const politics: WorldSection = {
  key: 'politics',
  title: '政治地理',
  facts: [
    {
      provenance: 'canonical',
      content:
        '「十六大國（Mahājanapadas）」之名單見於增支部，是經內對當時主要國邦的列舉。',
      source_ref: 'an',
      note: '經內名單可定位經段；屬正典。',
    },
    {
      provenance: 'scholarly',
      content:
        '佛陀時代的恆河平原正經歷「第二次城市化」：城鎮、貿易與國邦政治興起。摩竭陀（都王舍城）與憍薩羅（都舍衛城）為兩大強權，並有跋耆／離車等共和寡頭邦並存。',
      source_ref: 'Romila Thapar, Early India: From the Origins to AD 1300 (2002)；F. R. Allchin, The Archaeology of Early Historic South Asia (1995)',
      note: '為廣泛接受的史學框架，但絕對年代仍有辯論；年代一律以「約／範圍」表述。',
    },
  ],
};

export const society: WorldSection = {
  key: 'society',
  title: '社會經濟',
  facts: [
    {
      provenance: 'scholarly',
      content:
        '城鎮與貿易帶動貨幣經濟，居士／商人（gahapati）階層抬頭；婆羅門正統與新興沙門（出家遊行）潮流並存。',
      source_ref: 'Hermann Kulke & Dietmar Rothermund, A History of India (4th ed., 2004)',
      note: '學界重建，絕對年代寫為「約」。',
    },
  ],
};

export const thought: WorldSection = {
  key: 'thought',
  title: '思想環境',
  facts: [
    {
      provenance: 'scholarly',
      content:
        '沙門運動興盛，與同代的耆那教（大雄 Mahāvīra）、六師外道等並存，是一個多元的思想市場。',
      source_ref: 'Johannes Bronkhorst, The Two Sources of Indian Asceticism (1993)；Richard Gombrich, Theravāda Buddhism (2nd ed., 2006)',
      note: '客觀並陳，不以任何一方立場褒貶他派。',
    },
  ],
};

export const events: WorldSection = {
  key: 'events',
  title: '天災人禍',
  facts: [
    {
      provenance: 'canonical',
      content:
        '《大般涅槃經》（長部16）開篇載阿闍世王欲伐跋耆；典籍另載琉璃王（Viḍūḍabha）滅釋迦族。此類為在典記載的事件。',
      source_ref: 'dn16',
    },
    {
      provenance: 'canonical',
      content:
        '環境事實：季風週期與「雨安居」——僧團於雨季定居，是環境直接形塑修行制度的乾淨例子。',
    },
  ],
};

export const sections: WorldSection[] = [politics, society, thought, events];

// J-8 參考文獻（學界具名來源；本頁學界陳述之依據）。持續增補。
export const bibliography: string[] = [
  'Heinz Bechert (ed.), When Did the Buddha Live? The Controversy on the Dating of the Historical Buddha (1995).',
  'A. K. Warder, Indian Buddhism (1970).',
  'Richard Gombrich, Theravāda Buddhism: A Social History from Ancient Benares to Modern Colombo (2nd ed., 2006).',
  'Romila Thapar, Early India: From the Origins to AD 1300 (2002).',
  'F. R. Allchin, The Archaeology of Early Historic South Asia: The Emergence of Cities and States (1995).',
  'Hermann Kulke & Dietmar Rothermund, A History of India (4th ed., 2004).',
  'Johannes Bronkhorst, The Two Sources of Indian Asceticism (1993).',
  'G. P. Malalasekera, Dictionary of Pāli Proper Names (1937–38；公共領域).',
];

// 年代問題（SOURCING §5A：示範「不裁決」，各立場具名並列、全標 scholarly）
export const chronologyPositions: SourcedFact[] = [
  {
    provenance: 'scholarly',
    content: '修正長部年代（Corrected Long Chronology）：約 567–487 B.C.E.（入滅約 480 B.C.E.）。',
    note: 'Warder（1970）後一度被視為近乎確定。',
  },
  {
    provenance: 'scholarly',
    content: '印度短部年代（Short Chronology）：約 448–368 B.C.E.。',
  },
  {
    provenance: 'scholarly',
    content: '現代教科書近似：約 563–483 B.C.E.（常見，但仍是近似）。',
  },
  {
    provenance: 'scholarly',
    content:
      'Bechert 主編《When Did the Buddha Live?》（1995）主張修正長部年代「已不可維持」，推動往較晚年代重估。',
    note: '近年另有以天文／考古方法提出新異議者。',
  },
];
