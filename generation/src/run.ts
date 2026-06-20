// run.ts — L2 生成 orchestrator（本機 build 期，呼叫 Claude CLI sonnet）。
// 產出一律 draft → data/l2-draft/；校稿 approved 後由 review.ts 併入 data/{id}.json。
import { generate } from './tasks.ts';

const SUTTAS = (process.env.SUTTAS?.split(',').map((s) => s.trim()).filter(Boolean)) ?? ['mn10'];
const limitArg = process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1];
const limit = limitArg ? parseInt(limitArg, 10) : undefined;

async function main() {
  for (const id of SUTTAS) {
    console.log(`\n=== 生成 ${id} L2 草稿（sonnet）===`);
    await generate(id, { limit });
  }
  console.log('\n下一步：pnpm -C generation run review 校稿（approved 才上線）。');
}

main().catch((e) => {
  console.error('生成失敗：', e);
  process.exit(1);
});
