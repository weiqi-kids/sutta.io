// check-tokens.mjs — 擋「用了未定義的 design token（var(--x) 靜默失效變 0/無效）」這類 bug。
// 2026-07-09 事故：誤用不存在的 --space-5（階梯只有 1/2/3/4/6/8），CSS 靜默失效→margin 變 0→tab-bar 貼死內容。
// 用法（cwd=site）：node scripts/check-tokens.mjs   非零 exit＝有未定義 token，應在 push 前修掉。
import fs from 'node:fs';
import path from 'node:path';

const SITE = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const ROOT = path.resolve(SITE, '..');

// 1) 收集「已定義」的 token：src/styles/variables.css（原 design/design-tokens.css，2026-07-20 遷入）
//    ＋ src 內任何 `--foo:` 區域定義（元件本地變數）。
const defined = new Set();
const collectDefs = (txt) => {
  for (const m of txt.matchAll(/(--[a-z0-9-]+)\s*:/gi)) defined.add(m[1]);
};
collectDefs(fs.readFileSync(path.join(SITE, 'src/styles/variables.css'), 'utf8'));

// 2) 掃 src 的所有 .astro/.css/.ts/.tsx，收集 var(--foo) 使用處，並沿路補收本地定義。
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(astro|css|tsx?|mjs)$/.test(e.name)) files.push(p);
  }
})(path.join(SITE, 'src'));

for (const f of files) collectDefs(fs.readFileSync(f, 'utf8')); // 本地 --var 也算已定義

const bad = [];
for (const f of files) {
  const txt = fs.readFileSync(f, 'utf8');
  const lines = txt.split('\n');
  lines.forEach((line, i) => {
    for (const m of line.matchAll(/var\((--[a-z0-9-]+)/gi)) {
      const tok = m[1];
      if (!defined.has(tok)) bad.push(`${path.relative(ROOT, f)}:${i + 1}  未定義 token ${tok}`);
    }
  });
}

if (bad.length) {
  console.error(`✗ 發現 ${bad.length} 處未定義 design token（會靜默失效）：`);
  bad.forEach((b) => console.error('  ' + b));
  process.exit(1);
}
console.log('✓ design token 檢查通過：所有 var(--x) 皆有定義。');
