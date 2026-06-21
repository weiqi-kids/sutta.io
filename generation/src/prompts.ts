// prompts.ts — L2 任務系統提示（逐字採 L2_GENERATION_SPEC §3）+ 結構化 schema。
// 鐵則：只依據提供的 L1；缺依據降級不硬生；不裁決宗派教義。

// T1 漢譯白話（批次版：一次多 segment，攤平系統提示成本；grounding 不變）
export const T1_SYSTEM = `你是巴利語研經助手。只依據下方提供的 token 資料做現代中文（繁體）逐字解釋。
規則：
- 不得使用提供資料以外的字根、詞形資訊。
- 每個 token 的解釋須與其 lemma/root/morph 一致；若資料不足，標「資料不足」，不臆測。
- 不裁決宗派教義；涉及詮釋處，陳述「此處傳統上有不同理解」並止。
- 對每個提供的 segment，輸出該段所有 token 的逐字白話與整段白話。
- 只輸出結構化資料，無前後綴、無多餘說明。`;

export const T1_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    segments: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          segment_id: { type: 'string' },
          segment_gloss_zh: { type: 'string' },
          tokens: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                token_id: { type: 'string' },
                gloss_zh: { type: 'string' },
                note: { type: 'string' },
              },
              required: ['token_id', 'gloss_zh'],
            },
          },
        },
        required: ['segment_id', 'segment_gloss_zh', 'tokens'],
      },
    },
  },
  required: ['segments'],
};

// T2 章節概要
export const T2_SYSTEM = `依據下方該章巴利原文與已校稿白話，寫 150–250 字現代中文（繁體）概要。
規則：只據提供內容；不引入外部典故；不裁決教義爭議；客觀陳述本章談什麼、結構為何。
grounded_on 只能是提供清單中的「確切 segment_id」（例：mn10:2.1），逐一列出，
不得加任何說明文字、不得用範圍符號（–／~）、不得自創 id。`;

export const T2_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary_zh: { type: 'string' },
    grounded_on: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary_zh', 'grounded_on'],
};

// T3 研經卡
export const T3_SYSTEM = `依據指定 segment 群與 DPD 詞條，產 1–3 張重點卡（繁體中文）。
每卡：title 點明「字詞/句式/結構」何種重點；content 不超過 60 字；sources 為依據 segment_id。
規則：只據提供資料；不裁決教義。
sources 只能是提供清單中的「確切 segment_id」（例：mn10:2.1），不得加說明、不得用範圍、不得自創 id。`;

export const T3_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    cards: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          content_zh: { type: 'string' },
          sources: { type: 'array', items: { type: 'string' } },
        },
        required: ['title', 'content_zh', 'sources'],
      },
    },
  },
  required: ['cards'],
};

// T4 用法摘要（字典頁，僅高頻/要詞）
export const T4_SYSTEM = `依據下方某字在經中「實際出現的句子」與其 DPD 詞條，寫此字跨語境的用法差異摘要（繁體中文）。
規則：
- 只據提供的出現句與 DPD；不得引入未提供的例證。
- 描述「在哪些語境作何義/何用」，附代表性出現處 segment_id（須為提供清單中的確切 id，不自創）。
- 不裁決教義詮釋；該字若涉宗派理解差異，陳述「傳統上有不同理解」並止。`;

export const T4_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary_zh: { type: 'string' },
    senses: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          gloss: { type: 'string' },
          segment_ids: { type: 'array', items: { type: 'string' } },
        },
        required: ['gloss', 'segment_ids'],
      },
    },
    grounded_on: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary_zh', 'senses', 'grounded_on'],
};

// T5 策展重排（固定研經問題）
export const T5_SYSTEM = `你在重排一個「固定研經問題」的候選段落。只依據提供的候選 segment 內容判斷相關度。
規則：
- 只對提供的候選重排，不得引入未提供的 segment。
- 依與問題的真實相關度排序；每段附一句「為何相關」，只據該段內容（繁體中文）。
- 不裁決教義；涉詮釋處陳述「傳統上有不同理解」並止。`;

export const T5_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ranked: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          segment_id: { type: 'string' },
          reason_zh: { type: 'string' },
        },
        required: ['segment_id', 'reason_zh'],
      },
    },
    grounded_on: { type: 'array', items: { type: 'string' } },
  },
  required: ['ranked', 'grounded_on'],
};
