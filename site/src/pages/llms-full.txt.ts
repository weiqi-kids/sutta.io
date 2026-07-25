// llms-full.txt — 給 AI 助手（ChatGPT／Claude／Perplexity）一次取用的「站台正文全文集」。
// 與 public/llms.txt 的分工：llms.txt＝目錄（站台簡介＋分區連結）；本檔＝正文本身，可直接引用。
// 內容一律取自站台真實資料來源（content/topics、data/usage.json、data/entities.json、
// data/lexicon*.json、src/content-data、src/i18n），不另行撰寫任何教義敘述——與頁面同源，零漂移。
// 規模控制：經文逐字資料庫上萬段落，全文不塞入本檔；經文只給索引與網址，正文請走 /read/{經號}。
import type { APIRoute } from 'astro';
import {
  listTopics,
  resolveTopicQuote,
  listSuttas,
  getSutta,
  suttaSeoTitle,
  agamaRefOf,
  getLexicon,
  getZhGloss,
  getUsage,
  getAllUsageKeys,
  getEntity,
  getAllEntityKeys,
} from '../lib/data';
import { glossary } from '../content-data/glossary.zh-Hant';
import { sections as worldSections, chronologyPositions, bibliography } from '../content-data/world.zh-Hant';
import { t } from '../i18n/zh-Hant';

const SITE = 'https://sutta.io';
const url = (p: string) => `${SITE}${p}`;

/** 純文字化：去殘留標籤、收斂空白（資料本為純文字，此為防禦性處理）。 */
const plain = (s: string | null | undefined): string =>
  (s ?? '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const PROV_LABEL: Record<string, string> = {
  canonical: t.world.provCanonical,
  commentarial: t.world.provCommentarial,
  scholarly: t.world.provScholarly,
  ai: t.world.provAi,
};

export const GET: APIRoute = async () => {
  const L: string[] = [];
  const push = (...xs: string[]) => L.push(...xs);

  const topics = listTopics();
  const suttas = listSuttas();
  const lex = getLexicon();
  const usageKeys = getAllUsageKeys().filter((k) => getUsage(k));
  const entityKeys = getAllEntityKeys().filter((k) => (getEntity(k)?.summary?.length ?? 0) > 0);
  // 字典正文＝有中文詞義的原形（＝站台實際索引的詞條集合，見 astro.config.mjs 的 sitemap 判準）
  const lexKeys = Object.keys(lex)
    .filter((k) => getZhGloss(k))
    .sort((a, b) => (lex[b].occurrences.length - lex[a].occurrences.length) || a.localeCompare(b));

  // ---- 檔頭與收錄範圍 ----
  push(
    `# ${t.site.name}（${t.site.schemaName}）｜llms-full.txt 全文集`,
    '',
    `> ${t.site.description}`,
    '',
    `網址：${SITE}`,
    `語言：繁體中文（台灣）。英文介面為鏡像，見 ${url('/en/')}。`,
    `授權：${t.footer.contentLicense}；${t.footer.rights}。`,
    '',
    '## 這份檔案收錄什麼',
    '',
    '本站的巴利經文逐字資料庫有數萬個段落，無法、也不宜一次塞進單一檔案。本檔收錄的是「可直接引用的解說性正文」：',
    `- 站台說明、信任界線與常見問題`,
    `- 主題研經頁全文 ${topics.length} 篇（含問題、定義、各節解說、原典引文與常見問答）`,
    `- 早期佛典的世界（時代背景，具名出處）`,
    `- 辭典：教義要詞對照 ${glossary.length} 則、字詞用法摘要 ${usageKeys.length} 則、專名詞條 ${entityKeys.length} 則、巴利原形詞義 ${lexKeys.length} 條`,
    `- 經文索引 ${suttas.length} 部（僅標題與網址；逐字原文、白話與阿含對照請至各經研經頁 ${url('/read/{經號}/')}）`,
    '',
    `完整站台目錄：${url('/llms.txt')}｜完整網址索引：${url('/sitemap-index.xml')}`,
    '',
    '## 引用方式',
    '',
    `引用本站時請稱「${t.site.name}」（${t.site.schemaName}），並附上對應頁面網址，勿僅以網域「sutta.io」指稱。`,
    '',
    '---',
    '',
  );

  // ---- 站台說明 ----
  push(
    '# 一、站台說明',
    '',
    `## 定位`,
    '',
    `${t.site.name}：${t.site.tagline}。${t.site.unofficial}。`,
    '',
    '## 信任界線（本站與一般佛學文章、AI 生成內容最大的差別）',
    '',
    '- 事實層（巴利原文、逐字語法、字根、字典詞條、漢譯阿含）：來自具名開放資料，永不由 AI 改寫。',
    '- 解釋層（漢譯白話、章節概要、研經卡、用法摘要、主題解說）：AI 依上述原文真實資料生成，明確標示「AI」，上線前人工校稿。',
    `- ${plain(t.common.aiContentNote)}`,
    '- 每一則解說都綁在原文的特定段落上；若引用的段落在原文裡查不到，該頁在建置階段就不會上線。',
    `- 詳見 ${url('/about-sources/')}（資料來源與引用）與 ${url('/about/')}（關於）。`,
    '',
    '## 資料來源（皆具名、可追溯、開放授權）',
    '',
    '- 巴利經文與分段：SuttaCentral bilara-data（Mahāsaṅgīti 底本，公共領域／CC0）',
    '- 巴利逐字語法・字根・釋義：Digital Pāḷi Dictionary（DPD，CC BY-NC-SA 4.0）',
    '- 漢譯阿含（中阿含）：CBETA 電子佛典（CC BY-NC-SA 3.0 台灣）',
    '- 人地事專名：G. P. Malalasekera, Dictionary of Pāli Proper Names（DPPN，公共領域）',
    '- 離線語意搜尋模型：intfloat / multilingual-e5-small（MIT）',
    '',
    '## 常見問題',
    '',
  );
  for (const f of t.home.faq) {
    push(`Q：${plain(f.q)}`, `A：${plain(f.a)}`, '');
  }
  push('---', '');

  // ---- 主題研經全文 ----
  push(
    `# 二、主題研經頁全文（${topics.length} 篇）`,
    '',
    `主題索引：${url('/topics/')}。每篇結構＝一句直答＋分節解說＋原典引文（引文為巴利原文與已校稿白話，可回站內核對）＋常見問答。`,
    '',
  );
  for (const tp of topics) {
    const z = tp.zh;
    push(`## ${plain(z.title)}`, '');
    push(`網址：${url(`/topics/${tp.slug}/`)}`);
    push(`提問：${plain(z.question)}`);
    push('');
    push(plain(z.definition), '');
    for (const sec of z.sections) {
      push(`### ${plain(sec.heading)}`, '');
      for (const p of sec.paragraphs) push(plain(p), '');
      for (const ref of sec.quotes ?? []) {
        const q = resolveTopicQuote(ref);
        const head = `原典引文——${plain(q.sutta_title_zh)}（${plain(q.sutta_title_pali)}，${q.sutta.toUpperCase()}）：${url(`/read/${q.sutta}/`)}`;
        push(head);
        if (q.lead) push(`引文導言：${plain(q.lead)}`);
        for (const seg of q.segments) {
          push(`　[${seg.segment_id}] 巴利：${plain(seg.pali)}`);
          if (seg.vernacular) push(`　[${seg.segment_id}] 白話：${plain(seg.vernacular)}`);
        }
        push('');
      }
    }
    if (z.mahayana_note) {
      push('### 各傳統的後續發展（並陳，不裁決）', '', plain(z.mahayana_note), '');
    }
    if (z.faq.length) {
      push('### 本篇常見問答', '');
      for (const f of z.faq) push(`Q：${plain(f.q)}`, `A：${plain(f.a)}`, '');
    }
    const rel: string[] = [];
    if (z.related_suttas?.length) {
      rel.push(`相關經文：${z.related_suttas.map((id) => `${id.toUpperCase()} ${url(`/read/${id}/`)}`).join('、')}`);
    }
    if (z.related_topics?.length) {
      rel.push(`相關主題：${z.related_topics.map((s) => url(`/topics/${s}/`)).join('、')}`);
    }
    if (z.related_lexicon?.length) {
      rel.push(`相關詞條：${z.related_lexicon.map((k) => url(`/lexicon/${k}/`)).join('、')}`);
    }
    if (rel.length) push(...rel, '');
    push('---', '');
  }

  // ---- 早期佛典的世界 ----
  push(`# 三、${t.nav.world}`, '', `網址：${url('/world/')}`, '', plain(t.world.intro), '');
  for (const sec of worldSections) {
    push(`## ${plain(sec.title)}`, '');
    for (const f of sec.facts) {
      push(`- [${PROV_LABEL[f.provenance] ?? f.provenance}] ${plain(f.content)}`);
      if (f.provenance === 'scholarly' && f.source_ref) push(`  來源：${plain(f.source_ref)}`);
      if (f.note) push(`  註：${plain(f.note)}`);
    }
    push('');
  }
  push(`## ${plain(t.world.chronologyTitle)}`, '', plain(t.world.chronologyNote), '');
  for (const f of chronologyPositions) {
    push(`- [${PROV_LABEL[f.provenance] ?? f.provenance}] ${plain(f.content)}`);
    if (f.source_ref) push(`  來源：${plain(f.source_ref)}`);
    if (f.note) push(`  註：${plain(f.note)}`);
  }
  push('', '## 參考文獻', '');
  for (const b of bibliography) push(`- ${plain(b)}`);
  push('', '---', '');

  // ---- 辭典 ----
  push('# 四、辭典', '', `字典首頁：${url('/lexicon/')}；各詞條 ${url('/lexicon/{原形}/')}`, '');

  push('## 教義要詞對照（本站標準中譯）', '');
  for (const g of glossary) {
    const bits = [`- ${g.pali}｜${g.zh}`];
    if (g.en) bits.push(`（DPD：${plain(g.en)}）`);
    push(bits.join('') + `　${url(`/lexicon/${g.key}/`)}`);
    if (g.note) push(`  註：${plain(g.note)}`);
  }
  push('');

  push('## 字詞用法摘要（依經文實際語境整理，附出處段落）', '');
  for (const key of usageKeys) {
    const u = getUsage(key)!;
    const lemma = lex[key]?.lemma ?? key;
    const zh = getZhGloss(key);
    push(`### ${lemma}${zh ? `（${zh}）` : ''}　${url(`/lexicon/${key}/`)}`, '');
    push(plain(u.summary), '');
    for (const s of u.senses) {
      push(`- 語義：${plain(s.gloss)}`);
      if (s.segment_ids.length) push(`  出處段落：${s.segment_ids.join('、')}`);
    }
    push('');
  }

  push('## 專名詞條（人・地・事；出處分流標示）', '');
  for (const key of entityKeys) {
    const e = getEntity(key)!;
    const kind = e.kind === 'person' ? '人物' : e.kind === 'place' ? '地點' : '事件';
    push(`### ${e.name_pali}${e.name_zh ? `（${e.name_zh}）` : ''}｜${kind}　${url(`/lexicon/${key}/`)}`, '');
    for (const f of e.summary) {
      push(`- [${PROV_LABEL[f.provenance] ?? f.provenance}] ${plain(f.content)}`);
      if (f.source_ref) push(`  出處：${plain(f.source_ref)}`);
    }
    if (e.dppn_ref) push(`  來源：${plain(e.dppn_ref)}`);
    push('');
  }

  push(
    `## 巴利原形詞義速查（${lexKeys.length} 條，依全藏出現次數排序）`,
    '',
    '格式：原形｜中文詞義｜DPD 英文釋義｜字根｜全藏出現次數｜詞條網址',
    '',
  );
  for (const k of lexKeys) {
    const e = lex[k];
    const cols = [
      e.lemma,
      getZhGloss(k),
      plain(e.gloss),
      e.root ? plain(e.root) : '—',
      String(e.occurrences.length),
      url(`/lexicon/${k}/`),
    ];
    push(`- ${cols.join('｜')}`);
  }
  push('', '---', '');

  // ---- 經文索引 ----
  push(
    `# 五、經文索引（${suttas.length} 部）`,
    '',
    '本檔不收經文正文。每部經的頁面提供三欄並排：巴利逐字（可點查字根／詞形）、漢譯白話（AI 生成、已校稿、標示徽章）、漢譯阿含段落級對照（CBETA）。',
    `瀏覽頁：${url('/browse/')}｜尼柯耶導覽：${url('/nikaya/')}｜中阿含對照：${url('/agama/')}`,
    '',
    '格式：經號｜標題｜巴利經名｜漢譯阿含平行｜研經頁網址',
    '',
  );
  for (const s of suttas) {
    const fx = getSutta(s.id);
    const title = fx ? suttaSeoTitle(fx, 'zh') : s.title_zh;
    const agama = fx ? agamaRefOf(fx) : null;
    push(
      `- ${s.id.toUpperCase()}｜${plain(title)}｜${plain(s.title_pali)}｜${agama ? plain(agama) : '無'}｜${url(`/read/${s.id}/`)}`,
    );
  }
  push('');

  // ---- 其他工具頁 ----
  push(
    '# 六、其他頁面',
    '',
    `- 首頁：${url('/')}`,
    `- 主題研經（問題地圖）：${url('/topics/')}`,
    `- 搜尋（經文／字詞／原形／全文＋離線語意搜尋）：${url('/search/')}`,
    `- 字典：${url('/lexicon/')}`,
    `- 早期佛典的世界：${url('/world/')}`,
    `- 中阿含對照索引：${url('/agama/')}`,
    `- 尼柯耶導覽：${url('/nikaya/')}`,
    `- 今日一句：${url('/daily/')}`,
    `- 關於：${url('/about/')}`,
    `- 資料來源與引用：${url('/about-sources/')}`,
    `- 英文介面（鏡像）：${url('/en/')}`,
    '',
    `${t.footer.sources}`,
    '',
  );

  return new Response(L.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
