// index.ts — L3 對話研經 / 生成式重排 serverless proxy（G-3）。
// 鐵則（SPEC §4.4 / §7）：只依據傳入的 L1 段落作答、附引用、不確定說不知道、不裁決宗派爭議。
// 金鑰只在 Worker secret（env.ANTHROPIC_API_KEY），絕不回給前端、絕不進 repo。

interface Env {
  ANTHROPIC_API_KEY: string;
  ALLOWED_ORIGIN: string;
  MODEL: string;
  RATE_LIMIT_PER_MIN: string;
  RL: KVNamespace;
}

interface Segment {
  id: string;
  pali?: string;
  vernacular?: string;
}

const SYS_CHAT = `你是巴利研經對話助手。只依據「下方提供的本經段落」作答，繁體中文。
規則（不可違反）：
- 只用提供的段落內容；提供資料以外的經文/字根/經號一律不得引入或臆測。
- 每個論點附依據的 segment_id（如 mn10:2.1）。
- 不確定或資料不足 → 明說「依提供的段落無法判定」，不補洞、不杜撰。
- 不裁決宗派教義；涉詮釋處陳述「傳統上有不同理解」並止。
- 簡潔、學術、平靜，不行銷語氣。`;

const SYS_RERANK = `你在對「任意研經查詢」重排候選段落。只依據提供的候選段落內容判斷相關度。
規則：只對提供的候選重排，不得引入未提供的 segment；每段附一句「為何相關」（繁中），只據該段內容；不裁決教義。
只輸出 JSON：{"ranked":[{"segment_id","reason_zh"}]}，無前後綴。`;

function corsHeaders(origin: string): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

async function rateLimited(env: Env, ip: string): Promise<boolean> {
  const limit = parseInt(env.RATE_LIMIT_PER_MIN || '15', 10);
  const bucket = Math.floor(Date.now() / 60000);
  const key = `rl:${ip}:${bucket}`;
  const cur = parseInt((await env.RL.get(key)) || '0', 10);
  if (cur >= limit) return true;
  await env.RL.put(key, String(cur + 1), { expirationTtl: 120 });
  return false;
}

function contextBlock(suttaTitle: string, segments: Segment[]): string {
  const lines = segments
    .slice(0, 400)
    .map((s) => `[${s.id}] 巴利：${s.pali ?? ''}${s.vernacular ? ' ｜白話：' + s.vernacular : ''}`)
    .join('\n');
  return `本經：${suttaTitle}\n以下為本經段落（僅此範圍可用）：\n${lines}`;
}

async function callAnthropic(env: Env, body: object, stream: boolean): Promise<Response> {
  return fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ ...body, stream }),
  });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN || '*';
    if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(origin) });

    const url = new URL(req.url);
    if (req.method !== 'POST') return new Response('Not found', { status: 404, headers: corsHeaders(origin) });

    // 來源檢查
    const reqOrigin = req.headers.get('Origin');
    if (origin !== '*' && reqOrigin && reqOrigin !== origin) {
      return new Response('Forbidden origin', { status: 403, headers: corsHeaders(origin) });
    }
    if (!env.ANTHROPIC_API_KEY) {
      return new Response('Proxy 未設定金鑰', { status: 500, headers: corsHeaders(origin) });
    }

    // 速率限制
    const ip = req.headers.get('CF-Connecting-IP') || 'unknown';
    if (env.RL && (await rateLimited(env, ip))) {
      return new Response('查詢過於頻繁，請稍候再試。', { status: 429, headers: corsHeaders(origin) });
    }

    const cors = corsHeaders(origin);

    try {
      const data = (await req.json()) as any;

      // ---- L3 對話（串流） ----
      if (url.pathname === '/chat') {
        const ctx: { suttaId: string; title: string; segments: Segment[] } = data.context;
        const messages = (data.messages ?? []).slice(-12);
        if (!ctx?.segments?.length || !messages.length) {
          return new Response('缺少 context 或 messages', { status: 400, headers: cors });
        }
        const upstream = await callAnthropic(
          env,
          {
            model: env.MODEL,
            max_tokens: 1024,
            system: `${SYS_CHAT}\n\n${contextBlock(ctx.title, ctx.segments)}`,
            messages: messages.map((m: any) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content) })),
          },
          true
        );
        if (!upstream.ok || !upstream.body) {
          return new Response(`上游錯誤 ${upstream.status}`, { status: 502, headers: cors });
        }
        // 將 Anthropic SSE 的文字增量轉成純文字串流給前端
        const stream = transformAnthropicStream(upstream.body);
        return new Response(stream, {
          headers: { ...cors, 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
        });
      }

      // ---- 任意查詢生成式重排 ----
      if (url.pathname === '/rerank') {
        const question: string = data.question;
        const candidates: Segment[] = (data.candidates ?? []).slice(0, 20);
        if (!question || !candidates.length) {
          return new Response('缺少 question 或 candidates', { status: 400, headers: cors });
        }
        const upstream = await callAnthropic(
          env,
          {
            model: env.MODEL,
            max_tokens: 1024,
            system: SYS_RERANK,
            messages: [
              {
                role: 'user',
                content: JSON.stringify({ question_zh: question, candidates: candidates.map((c) => ({ segment_id: c.id, pali: c.pali, vernacular_gloss: c.vernacular })) }),
              },
            ],
          },
          false
        );
        const j = (await upstream.json()) as any;
        const text = j?.content?.[0]?.text ?? '{"ranked":[]}';
        return new Response(text, { headers: { ...cors, 'content-type': 'application/json' } });
      }

      return new Response('Not found', { status: 404, headers: cors });
    } catch (e: any) {
      return new Response(`錯誤：${e?.message ?? e}`, { status: 500, headers: cors });
    }
  },
};

// 把 Anthropic 的 SSE 串流抽出 text_delta，輸出純文字串流
function transformAnthropicStream(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buf = '';
  return new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          const ev = JSON.parse(payload);
          if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') {
            controller.enqueue(encoder.encode(ev.delta.text));
          }
        } catch {
          /* 忽略非 JSON 行 */
        }
      }
    },
    cancel() {
      reader.cancel();
    },
  });
}
