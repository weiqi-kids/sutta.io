// glossary.zh-Hant.ts — 教義詞彙對照表（F-2）。
// 目的：固定核心要詞的譯法，防 L2 生成前後不一致（L2 生成已採此基準）。
// 每詞繫於 DPD（英文釋義/字根見字典頁 /lexicon/{key}，真實資料）；中文為本站採用之標準譯法。
export interface GlossTerm {
  pali: string;
  key: string; // /lexicon/{key}（折疊鍵）
  zh: string; // 本站標準中文譯法
  en?: string; // DPD 釋義摘（英文）
  note?: string;
}

// 念處經（MN10）核心要詞；持續增補。
export const glossary: GlossTerm[] = [
  { pali: 'sati', key: 'sati', zh: '念', en: 'mindfulness; awareness', note: '不譯「記憶」；指當下的繫念覺知。' },
  { pali: 'satipaṭṭhāna', key: 'satipatthana', zh: '念處', en: 'foundation/establishment of mindfulness' },
  { pali: 'sampajañña', key: 'sampajanna', zh: '正知', en: 'clear comprehension', note: '與「念(sati)」並舉，不混為一談。' },
  { pali: 'kāya', key: 'kaya', zh: '身', en: 'body' },
  { pali: 'vedanā', key: 'vedana', zh: '受', en: 'feeling; sensation', note: '不譯「情緒」；指樂/苦/不苦不樂的感受。' },
  { pali: 'citta', key: 'citta', zh: '心', en: 'mind; heart' },
  { pali: 'dhamma', key: 'dhamma', zh: '法', en: 'phenomenon; teaching; mental object', note: '依文脈分「諸法(所緣)/正法(教法)」，譯時標明。' },
  { pali: 'nīvaraṇa', key: 'nivarana', zh: '蓋', en: 'hindrance', note: '五蓋：貪欲、瞋恚、昏沉睡眠、掉舉惡作、疑。' },
  { pali: 'bojjhaṅga', key: 'bojjhanga', zh: '覺支', en: 'factor of awakening', note: '七覺支。' },
  { pali: 'anupassanā', key: 'anupassana', zh: '隨觀', en: 'contemplation; observing', note: '如「身隨觀(kāyānupassanā)」。' },
  { pali: 'pajānāti', key: 'pajanati', zh: '了知', en: 'understands; clearly knows' },
  { pali: 'ātāpī', key: 'atapi', zh: '熱忱／精勤', en: 'ardent', note: '念處修習的三要素之一（精勤・正知・正念）。' },
];
