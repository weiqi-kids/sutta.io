// scan-secrets.ts — 金鑰掃描（BUILD_SPEC §4 / §8.3）
// 掃 build 產物與資料/原始碼，確認無金鑰字串。任一命中 → 退出碼 1（CI fail）。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// 掃描目標：靜態產物 + 資料 + 各原始碼目錄
const TARGETS = ['site/dist', 'data', 'site/src', 'pipeline/src', 'generation/src', 'content'];

// 金鑰特徵（不誤判一般文字）：
const PATTERNS: { name: string; re: RegExp }[] = [
  { name: 'Anthropic API key', re: /sk-ant-[A-Za-z0-9_-]{20,}/ },
  { name: 'OpenAI-style key', re: /\bsk-[A-Za-z0-9]{32,}\b/ },
  { name: 'AWS access key id', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'GitHub token', re: /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}\b/ },
  { name: 'Google API key', re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { name: 'Private key block', re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: 'Generic api_key assignment', re: /(api[_-]?key|secret|token)\s*[:=]\s*['"][A-Za-z0-9_\-]{24,}['"]/i },
];

const SKIP_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.woff', '.woff2', '.ttf', '.bin', '.svg', '.ico']);

let hits = 0;
let scanned = 0;

function walk(dir: string) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      walk(full);
    } else {
      if (SKIP_EXT.has(path.extname(entry.name).toLowerCase())) continue;
      scanFile(full);
    }
  }
}

function scanFile(file: string) {
  let text: string;
  try {
    text = fs.readFileSync(file, 'utf-8');
  } catch {
    return;
  }
  scanned++;
  for (const { name, re } of PATTERNS) {
    const m = text.match(re);
    if (m) {
      hits++;
      console.error(`✗ 疑似金鑰（${name}）於 ${path.relative(ROOT, file)}：${m[0].slice(0, 12)}…`);
    }
  }
}

for (const t of TARGETS) walk(path.join(ROOT, t));

if (hits > 0) {
  console.error(`\n金鑰掃描失敗：${hits} 處疑似金鑰。靜態產物不得含金鑰（BUILD §4）。`);
  process.exit(1);
}
console.log(`✓ 金鑰掃描通過（掃 ${scanned} 檔，無金鑰字串）。`);
