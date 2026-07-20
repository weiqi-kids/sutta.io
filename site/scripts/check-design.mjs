// 設計規範守門 v2（團隊共用；v1 源自 dreamer868，v2 加 css 白名單＋掃 .svelte）：
// 掃 src/ 下所有 .css/.astro/.svelte，違規即 exit 1（pnpm build 前自動跑）。
// 規則（見 src/styles/variables.css 檔頭）：
// 1. font-size 禁用 px（一律 var(--text-*) 階梯）
// 2. 顏色（hex / rgb() / hsl()）只准出現在 src/styles/variables.css
// 3. 禁 !important
// 4. 禁外部 CDN（fonts.googleapis / cdnjs / unpkg / jsdelivr）
// 5. 統一 css 檔案：src/ 下的 .css 只准 src/styles/ 白名單那幾檔，新增即 fail
//    （元件樣式寫 Astro/Svelte scoped <style> 或進 global.css）
// 用法（cwd=site）：node scripts/check-design.mjs
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname, relative, basename } from "node:path";

const ROOT = "src";
const TOKEN_FILE = join("src", "styles", "variables.css");
// 舊站遷移期可暫加既有檔（凍結用，禁再擴充）；新站一律只有這兩檔。
const STYLE_WHITELIST = new Set(["variables.css", "global.css"]);
// sutta.io 遷移期凍結（2026-07-20，禁再擴充）：React island（tsx import）既有樣式檔，
// 無法改寫成 Astro scoped <style>；後續要嘛併入 global.css、要嘛維持這兩檔，不得新增第三檔。
const FROZEN_CSS = new Set([
  join("src", "components", "study", "study.css"),
  join("src", "components", "search", "search.css"),
]);
const exts = new Set([".css", ".astro", ".svelte"]);
const violations = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (exts.has(extname(p))) scan(p);
  }
}

function scan(file) {
  const rel = relative(".", file);
  if (extname(file) === ".css") {
    const inStyles = rel.startsWith(join("src", "styles") + "/");
    if ((!inStyles || !STYLE_WHITELIST.has(basename(file))) && !FROZEN_CSS.has(rel))
      violations.push(
        `${rel} css 檔不在白名單（統一 css：src/styles/{${[...STYLE_WHITELIST].join(",")}}＋凍結 ${FROZEN_CSS.size} 檔；元件樣式用 scoped <style>）`
      );
  }
  const isTokenFile = rel === TOKEN_FILE;
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    const loc = `${rel}:${i + 1}`;
    if (/font-size\s*:\s*[0-9.]+px/i.test(line))
      violations.push(`${loc} px 字級（改用 var(--text-*)）: ${line.trim()}`);
    if (!isTokenFile && /(#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\()/.test(line) && !/url\(/.test(line))
      violations.push(`${loc} token 外硬編顏色（改用 var(--color-*)）: ${line.trim()}`);
    if (/!important/.test(line))
      violations.push(`${loc} 禁用 !important: ${line.trim()}`);
    if (/(fonts\.googleapis|fonts\.gstatic|cdnjs\.cloudflare|unpkg\.com|cdn\.jsdelivr)/.test(line))
      violations.push(`${loc} 外部 CDN（字型/資源一律自託管或系統堆疊）: ${line.trim()}`);
  });
}

walk(ROOT);
if (violations.length) {
  console.error(`設計規範違規 ${violations.length} 處：\n` + violations.join("\n"));
  process.exit(1);
}
console.log("設計規範檢查通過：css 白名單、無 px 字級、無 token 外顏色、無 !important、無外部 CDN。");
