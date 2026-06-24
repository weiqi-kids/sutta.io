// claude.ts — 以本機 Claude CLI（sonnet）當 build harness 呼叫結構化生成（L2_GENERATION §8）。
// 金鑰留在本機/CLI 環境，不入靜態產物；生成於 build 期一次性，runtime 零 LLM。
import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const ERR_LOG = path.join(ROOT, 'pipeline/.cache/claude-errors.log');

export interface ClaudeResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  costUsd?: number;
  retriable?: boolean; // 是否值得退避重試（限流/逾時/5xx/暫態）
}

const TIMEOUT_MS = 600_000;

// 判斷錯誤是否為「暫態、值得退避重試」：限流(429)、過載、5xx、逾時。
function isRetriable(...parts: unknown[]): boolean {
  const s = parts.map((p) => (p == null ? '' : String(p))).join(' ');
  return /\b429\b|\b5\d\d\b|rate.?limit|overloaded|too many requests|timeout|逾時|SIGKILL|temporar|unavailable|ECONNRESET|ETIMEDOUT/i.test(s);
}

// 失敗時把真實原因（含原始 envelope / stderr）留檔，供事後診斷。
function logFailure(detail: string, raw: string): void {
  try {
    mkdirSync(path.dirname(ERR_LOG), { recursive: true });
    appendFileSync(ERR_LOG, `\n[${new Date().toISOString()}] ${detail}\n  raw: ${raw.slice(0, 2000)}\n`);
  } catch {
    /* 記錄失敗不致命 */
  }
}

// 同步睡眠（build harness 可阻塞；不需 async 改寫呼叫端）。
function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
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
        // 不載入任何 MCP server：build harness 不需 MCP，且使用者設定的遠端 MCP
        // （claude.ai Gmail/Drive/Calendar 等「需驗證」）會在 claude -p 啟動時嘗試連線，
        // 偶發卡死 → 整個呼叫 hang 到 600s 被 SIGKILL（不耗 token、不到 API）。隔離掉。
        '--strict-mcp-config',
        // 同理不需任何工具，關閉以縮小啟動面。
        '--tools',
        '',
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
        timeout: TIMEOUT_MS,
        killSignal: 'SIGKILL', // 逾時確實終結子程序，避免累積卡死（運維教訓）
      }
    );
    const env = JSON.parse(out) as {
      is_error?: boolean;
      api_error_status?: unknown;
      result?: string;
      structured_output?: T;
      total_cost_usd?: number;
    };
    if (env.is_error || env.api_error_status) {
      const detail = `CLI 回報錯誤：is_error=${env.is_error} api_error_status=${JSON.stringify(env.api_error_status)} result=${(env.result ?? '').slice(0, 200)}`;
      logFailure(detail, out);
      return { ok: false, error: detail.slice(0, 400), costUsd: env.total_cost_usd, retriable: isRetriable(env.api_error_status, env.result) };
    }
    if (!env.structured_output) {
      const detail = `無 structured_output；result=${(env.result ?? '').slice(0, 200)}`;
      logFailure(detail, out);
      return { ok: false, error: detail.slice(0, 400), costUsd: env.total_cost_usd, retriable: false };
    }
    return { ok: true, data: env.structured_output, costUsd: env.total_cost_usd };
  } catch (e: any) {
    // execFileSync 拋出：逾時(SIGKILL)、非零退出、或子程序寫 stderr。
    const killed = e?.killed === true || e?.signal === 'SIGKILL';
    const stderr = e?.stderr?.toString?.() ?? '';
    const stdout = e?.stdout?.toString?.() ?? '';
    // claude -p 失敗時可能仍把 JSON envelope 印到 stdout（含 api_error_status）。
    let apiStatus: unknown = null;
    let resultText = '';
    try {
      const env = JSON.parse(stdout);
      apiStatus = env.api_error_status ?? null;
      resultText = env.result ?? '';
    } catch {
      /* stdout 非 JSON，忽略 */
    }
    const reason = killed ? `逾時 SIGKILL（>${TIMEOUT_MS / 1000}s API 等待）` : stderr || e?.message || String(e);
    const detail = `${reason}${apiStatus ? ` api_error_status=${JSON.stringify(apiStatus)}` : ''}${resultText ? ` result=${resultText.slice(0, 150)}` : ''}`;
    logFailure(detail, stdout || stderr || String(e));
    return { ok: false, error: detail.slice(0, 400), retriable: killed || isRetriable(apiStatus, stderr, reason) };
  }
}

/**
 * 呼叫 claude，含指數退避重試。
 * 可重試錯誤（限流/逾時/5xx）退避 5s→20s→60s 最多 3 次；
 * 不可重試錯誤（如未產 structured_output）僅快速重試 1 次。
 */
export function callClaudeStructured<T>(system: string, userText: string, schema: object): ClaudeResult<T> {
  const backoffs = [5_000, 20_000, 60_000];
  let last: ClaudeResult<T> = { ok: false, error: '未執行' };
  let nonRetriableTries = 0;
  for (let attempt = 0; attempt <= backoffs.length; attempt++) {
    const r = callOnce<T>(system, userText, schema);
    if (r.ok) return r;
    last = r;
    if (r.retriable) {
      if (attempt < backoffs.length) {
        const wait = backoffs[attempt];
        console.warn(`  ⚠ 暫態失敗：${r.error}\n     退避 ${wait / 1000}s 後重試（第 ${attempt + 1}/${backoffs.length} 次）`);
        sleepSync(wait);
        continue;
      }
    } else {
      // 不可重試：給一次快速重試（模型偶發未遵守 schema），再失敗就放棄。
      nonRetriableTries++;
      if (nonRetriableTries < 2) {
        console.warn(`  ⚠ 失敗（不可重試）：${r.error}；快速重試 1 次`);
        continue;
      }
    }
    break;
  }
  return { ok: false, error: `重試耗盡：${last.error}`, costUsd: last.costUsd };
}
