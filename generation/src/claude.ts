// claude.ts — 以本機 Claude CLI（sonnet）當 build harness 呼叫結構化生成（L2_GENERATION §8）。
// 金鑰留在本機/CLI 環境，不入靜態產物；生成於 build 期一次性，runtime 零 LLM。
import { execFileSync } from 'node:child_process';

export interface ClaudeResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  costUsd?: number;
}

/**
 * 呼叫 claude -p 取結構化輸出。
 * @param system  系統提示（L2_GENERATION §3 各任務逐字）
 * @param userText 使用者輸入（含 L1 grounding 資料；JSON 字串）
 * @param schema  JSON Schema（強制結構化輸出）
 */
function callOnce<T>(system: string, userText: string, schema: object): ClaudeResult<T> {
  try {
    // userText（含整經 grounding）以 stdin 餵入，不放 argv：大經（如 mn22 357 段）
    // 放 argv 會超過 OS ARG_MAX → spawnSync E2BIG。`claude -p` 無 prompt 引數時讀 stdin。
    const out = execFileSync(
      'claude',
      [
        '-p',
        '--append-system-prompt',
        system,
        '--model',
        'sonnet',
        '--output-format',
        'json',
        '--json-schema',
        JSON.stringify(schema),
      ],
      {
        input: userText,
        stdio: ['pipe', 'pipe', 'pipe'],
        encoding: 'utf-8',
        maxBuffer: 64 * 1024 * 1024,
        timeout: 600_000, // sonnet 仔細生成多段可達數分鐘
        killSignal: 'SIGKILL', // 逾時確實終結子程序，避免累積卡死（運維教訓）
      }
    );
    const env = JSON.parse(out) as {
      is_error?: boolean;
      result?: string;
      structured_output?: T;
      total_cost_usd?: number;
    };
    if (env.is_error) return { ok: false, error: 'CLI 回報 is_error' };
    if (!env.structured_output) return { ok: false, error: 'no structured_output', costUsd: env.total_cost_usd };
    return { ok: true, data: env.structured_output, costUsd: env.total_cost_usd };
  } catch (e: any) {
    const msg = e?.stderr?.toString?.() || e?.message || String(e);
    return { ok: false, error: msg.slice(0, 300) };
  }
}

/** 呼叫 claude（含 1 次重試，因逾時/暫態而退避）。 */
export function callClaudeStructured<T>(system: string, userText: string, schema: object): ClaudeResult<T> {
  const first = callOnce<T>(system, userText, schema);
  if (first.ok) return first;
  // 重試一次（暫態/逾時）
  const second = callOnce<T>(system, userText, schema);
  return second.ok ? second : { ok: false, error: `重試後仍失敗：${second.error}` };
}
