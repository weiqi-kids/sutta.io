// guardrails.ts — L2 防護欄（L2_GENERATION §4 判準 + §5 反矛盾）。可測，落地 C-4/C-5。
import type { SuttaFixture } from '@tipitaka/contracts';

export interface GuardIssue {
  kind: 'grounding' | 'fabricated_ref' | 'contradiction';
  where: string;
  detail: string;
}

const CASES = ['主格', '對格', '具格', '與格', '從格', '屬格', '處格', '呼格'];

/** 引用存在性（§4）：grounded_on / sources / token_id 須存在於該經。 */
export function checkGrounding(ids: string[], valid: Set<string>, where: string): GuardIssue[] {
  const issues: GuardIssue[] = [];
  for (const id of ids) {
    if (!valid.has(id)) issues.push({ kind: 'grounding', where, detail: `引用不存在的 ${id}` });
  }
  return issues;
}

/** 不捏經號（§4）：輸出不得出現 context 未提供的經號。 */
export function checkFabricatedRefs(text: string, allow: Set<string>, where: string): GuardIssue[] {
  const issues: GuardIssue[] = [];
  const re = /\b([mdsa]n)\s*(\d+)\b/gi; // mn/dn/sn/an + 數字
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const ref = `${m[1].toLowerCase()}${m[2]}`;
    if (!allow.has(ref)) issues.push({ kind: 'fabricated_ref', where, detail: `疑似捏造經號 ${m[0]}` });
  }
  // 漢譯阿含經號（如「中阿含99」），允許清單外即標
  const re2 = /(中阿含|長阿含|雜阿含|增壹?一?阿含)\s*第?\s*(\d+)/g;
  while ((m = re2.exec(text))) {
    const ref = `${m[1]}${m[2]}`;
    if (!allow.has(ref)) issues.push({ kind: 'fabricated_ref', where, detail: `疑似捏造阿含經號 ${m[0]}` });
  }
  return issues;
}

/**
 * 反矛盾（§5）：白話隱含格位不得與 DPD morph 衝突。
 * 僅在白話「明確指出某格位」且與 token morph 的格位不同時 flag（不臆測）。
 */
export function checkCaseContradiction(glossZh: string, morphDisplay: string | null, where: string): GuardIssue[] {
  if (!morphDisplay) return [];
  const morphCase = CASES.find((c) => morphDisplay.includes(c));
  if (!morphCase) return [];
  const glossCases = CASES.filter((c) => glossZh.includes(c));
  for (const gc of glossCases) {
    if (gc !== morphCase) {
      return [
        {
          kind: 'contradiction',
          where,
          detail: `白話稱「${gc}」但 DPD morph 為「${morphCase}」`,
        },
      ];
    }
  }
  return [];
}

/** 該經有效 id 集（segment + token）與經號允許清單。 */
export function buildValidSets(sutta: SuttaFixture) {
  const segIds = new Set(sutta.segments.map((s) => s.segment_id));
  const tokenIds = new Set<string>();
  for (const s of sutta.segments) for (const t of s.pali_tokens) tokenIds.add(t.token_id);
  const allowRefs = new Set<string>([sutta.sutta.id]);
  // 允許該經 parallel 的阿含經號（passage.agama.ref 內出現的數字）
  for (const p of sutta.passages) {
    if (p.agama?.ref) {
      const mm = p.agama.ref.match(/(中阿含|長阿含|雜阿含|增壹?一?阿含)\s*(\d+)/);
      if (mm) allowRefs.add(`${mm[1]}${mm[2]}`);
    }
  }
  return { segIds, tokenIds, allowRefs };
}
