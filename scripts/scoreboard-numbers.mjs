#!/usr/bin/env node
// 印出每日 SEO Slack 日報【記分板】那行要用的四個數字，唯一合法來源。
// 遠因：這四個數字 2026-07-19~07-29 間被憑印象/用錯分母寫錯過至少 7 次
// （見記憶 sutta-io-slack-scoreboard-numbers）。寫日報前一律跑這支，不可憑印象。
// 用法：node scripts/scoreboard-numbers.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const sb = JSON.parse(readFileSync(join(repo, 'data/seo-daily/scoreboard.json'), 'utf8'));

const pages = Object.values(sb.pages);
const M = pages.length;
const N = pages.filter((v) => typeof v === 'string' && v.includes('indexed')).length;

const kws = sb.keywords;
const K = kws.length;
const X = kws.filter((k) => (k.impr_7d || 0) > 0).length;
const Y = kws.filter((k) => k.best_pos != null && k.best_pos <= 20).length;
const Z = kws.filter((k) => k.best_pos != null && k.best_pos <= 10).length;

console.log(`收錄 ${N}/${M} 頁｜有曝光 ${X}/${K} 詞｜前20 ${Y} 詞｜前10 ${Z} 詞`);
