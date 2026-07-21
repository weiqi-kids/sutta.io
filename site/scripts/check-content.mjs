// 內容守門（去 AI 味）——與 check-design.mjs 同框架，掛進 pnpm build 前置。
// 規則來源：credo audit-ai-tone / appi check-ai-tone / evidence audit-ai-tone / yao style-guide 的跨站交集
// （見記憶 content-no-ai-flavor 的四層檢查表）。站台特化規則（folk 療癒詩／yao 顧問腔／credo 括號）不放這，各站自行擴充。
//
// 兩級判定：
//   ERROR（擋 build，exit 1）：near-zero 誤判的強 AI 指紋，單一命中即擋。
//   WARN （只印，不擋）：高誤判軟訊號，分「詞彙/句式/結構/語氣」四層；
//     單一檔案跨 ≥3 個不同層級命中 → 升級為 ERROR（記憶鐵則：命中 3 項不同層級才算 AI 味）。
//
// 掃描範圍（grandfather 存量，關鍵）：
//   預設＝只掃「相對 origin/main 的變動檔」（已提交＋工作區＋未追蹤）中的 src/**/*.md(x)；
//     抓不到 git base（CI 淺 checkout）→ 掃 0 檔、exit 0，永不誤擋。
//   `--all`＝全站盤點（永遠 exit 0，供人工普查）。
//   `<file>...`＝只掃指定檔（供 newsroom/產線產文後自檢）。
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

const args = process.argv.slice(2);
const ALL = args.includes("--all");
const fileArgs = args.filter((a) => !a.startsWith("--"));

// ── 強指紋（單一命中即 ERROR） ──
const ERROR_TELLS = [
  ["「不是X，而是Y」下定義", /不是[^。！？\n]{1,30}而是/],
  ["「不僅…更/還/也」排比", /不僅[^。！？\n]{1,30}(更|還|也)/],
  ["「不只是…更是/而是」", /不只是?[^。！？\n]{1,30}(更是|而是)/],
  ["「並非…而是」", /並非[^。！？\n]{1,30}而是/],
  ["「值得注意/一提/關注的是」", /值得(注意|一提|關注|玩味)的是/],
  ["「換句話說」", /換句話說/],
  ["空泛收束語", /(綜上所述|總的來說|總結來說|總而言之|歸根結底|整體而言)/],
  ["「真正的問題/關鍵是」", /真正的[^。，、\n]{0,8}(問題|挑戰|關鍵|價值)(是|在於)/],
  ["「隨著/伴隨…的發展」開場公式", /(隨著|伴隨)[^。！？\n]{1,20}的?(發展|普及|進步|到來|興起)[，,]/],
  ["「在…的今天」", /在[^。！？\n]{1,16}的今天/],
  ["拔高套語", /(至關重要|不可或缺|舉足輕重)/],
  ["模糊引用（無出處）", /(研究顯示|有研究指出|多項研究指出|國外研究發現|臨床研究指出|專家認為|學者認為|普遍認為|業界普遍|有文獻(表示|指出))/],
];

// 模板化開頭（只驗正文第一句；當開頭時是 near-zero 誤判 → ERROR）
const BANNED_OPENINGS = [
  /^我[^們]/, /^我$/, /^老實(講|說)/, /^最近[，,]?\s*有(讀者|客戶|朋友|人)/,
  /^在這個/, /^隨著/, /^近年來/,
];

// ── 軟訊號（分層累積；跨 ≥3 層才擋） ──
const WARN_LAYERS = {
  詞彙: [
    ["賦能/助力/底層邏輯類", /(賦能|助力|底層邏輯|頂層設計)/],
    ["化繁為簡/息息相關/不謀而合", /(化繁為簡|息息相關|不謀而合)/],
    ["結構性/系統性堆疊", /(結構性|系統性)(根源|缺口|問題|矛盾|挑戰|斷層)/],
  ],
  句式: [
    ["破折號下定義", /[—―]{1,3}|(?<![-!])--(?!-)/],
    ["三段對仗排比", /針對[^，。\n]{1,20}，[^，。\n]{0,30}針對/],
    ["「這是一個X，也是一個Y」", /這(是|既是)一個[^，。\n]{2,14}，也是一個/],
  ],
  結構: [
    ["首先…其次…最後", /首先[\s\S]{0,200}其次[\s\S]{0,200}最後/],
    ["讓我們/不妨/你是否曾", /(讓我們|不妨|你是否曾|相信透過|希望本文)/],
  ],
  語氣: [
    ["拔高收尾（正是/才是…關鍵）", /(正是|才是)[^。，、\n]{0,22}(的關鍵|關鍵所在|所在)/],
    ["自我辯白腔", /(危言聳聽|老實承認|坦白(說|講)|說白了)/],
    ["燈塔/見證/里程碑", /(的燈塔|重要里程碑|的見證(?!人))/],
  ],
};

// ── 站台特化擴充（各站把自己舊 gate 的規則 port 到這；上方核心跨站共用、不改，保證單一引擎） ──
// 範例：credo 全形括號旁白 → SITE_ERROR_TELLS.push(["括號旁白", /（[^）]*）/]);
//       yao 顧問腔 → SITE_WARN_LAYERS.詞彙.push(["顧問腔", /本質上[是為]|整體邏輯(是|在於)/]);
//       folk 療癒詩 → SITE_ERROR_TELLS.push(["療癒腔", /放下了|釋懷了|照亮彼此/]);
const SITE_ERROR_TELLS = [];
const SITE_WARN_LAYERS = { 詞彙: [], 句式: [], 結構: [], 語氣: [] };
// 站台可在此加白名單（命中不算違規）。預設空。例：credo 法律用語 /民國\d+年/、/第\d+條/。
const ALLOW = [];

// 合併核心＋站台特化
for (const t of SITE_ERROR_TELLS) ERROR_TELLS.push(t);
for (const [layer, tells] of Object.entries(SITE_WARN_LAYERS))
  for (const t of tells) (WARN_LAYERS[layer] ||= []).push(t);

// ── 只留正文：遮掉 frontmatter / fenced code / inline code / 連結URL / HTML，保留行結構 ──
function proseMask(raw) {
  const lines = raw.split("\n");
  let inFence = false, fmEnd = -1;
  if (lines[0]?.trim() === "---") {
    for (let i = 1; i < lines.length; i++) if (lines[i].trim() === "---") { fmEnd = i; break; }
  }
  return lines.map((line, i) => {
    if (fmEnd >= 0 && i <= fmEnd) return "";
    if (/^\s*```/.test(line)) { inFence = !inFence; return ""; }
    if (inFence) return "";
    return line
      .replace(/`[^`]*`/g, " ")            // inline code
      .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1") // 連結/圖：留文字去 URL
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " ");
  });
}

function firstProseSentence(masked) {
  for (const line of masked) {
    const t = line.trim().replace(/^#+\s*/, "").replace(/^[-*>]\s*/, "");
    if (t) return t;
  }
  return "";
}

function scanFile(file) {
  if (!existsSync(file)) return { errors: [], warns: [] };
  const masked = proseMask(readFileSync(file, "utf8"));
  const whole = masked.join("\n");
  const errors = [], warns = [];
  const allowed = (s) => ALLOW.some((re) => re.test(s));

  masked.forEach((line, i) => {
    if (!line.trim() || allowed(line)) return;
    for (const [label, re] of ERROR_TELLS)
      if (re.test(line)) errors.push({ loc: `${file}:${i + 1}`, label, text: line.trim() });
  });

  const first = firstProseSentence(masked);
  if (BANNED_OPENINGS.some((re) => re.test(first)))
    errors.push({ loc: `${file}:開頭`, label: "模板化開頭", text: first.slice(0, 40) });

  const hitLayers = new Set();
  for (const [layer, tells] of Object.entries(WARN_LAYERS))
    for (const [label, re] of tells) {
      const m = re.exec(whole);
      if (m) { warns.push({ file, layer, label, text: m[0].slice(0, 30) }); hitLayers.add(layer); }
    }
  // 跨 ≥3 層 → 整檔升級為 ERROR
  if (hitLayers.size >= 3) {
    errors.push({ loc: file, label: `AI 味跨 ${hitLayers.size} 層（${[...hitLayers].join("/")}）`, text: "軟訊號累積達鐵則門檻" });
  }
  return { errors, warns };
}

function targetFiles() {
  if (fileArgs.length) return fileArgs.filter((f) => /\.mdx?$/.test(f));
  const run = (cmd) => { try { return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch { return null; } };
  if (ALL) {
    // :(glob) magic 讓 ** 遞迴匹配 0+ 層，含直接放在 src/ 下的檔；
    // 無此 magic 時 git 的 src/**/*.md 會漏掉 src/foo.md（需至少一層子目錄）。
    const out = run("git ls-files ':(glob)src/**/*.md' ':(glob)src/**/*.mdx'");
    return out ? out.split("\n").filter(Boolean) : [];
  }
  const base = run("git merge-base origin/main HEAD");
  if (!base) { console.log("內容守門：抓不到 git base（origin/main），跳過變動掃描。"); return null; }
  // sutta.io：Astro 在子目錄 site/，.git 在 repo root。cwd=site 執行時，
  // `git diff` 預設輸出 repo-root 相對路徑（site/src/…），會漏過 `^src/` 過濾；
  // 加 --relative 讓 diff 以 cwd(site) 為基準輸出並自動限縮到 site/ 子樹，
  // 與 --all 的 `git ls-files 'src/**'`（本就相對 cwd）一致。
  const sets = [
    run(`git diff --relative --name-only --diff-filter=ACMR ${base} HEAD`),
    run("git diff --relative --name-only --diff-filter=ACMR HEAD"),
    run("git ls-files --others --exclude-standard"),
  ];
  const files = [...new Set(sets.filter(Boolean).join("\n").split("\n"))]
    .filter((f) => /^src\/.*\.mdx?$/.test(f));
  return files;
}

const files = targetFiles();
if (files === null) process.exit(0); // 無 git base，安全放行
if (!files.length) { console.log("內容守門：無變動的 .md/.mdx 內容檔。"); process.exit(0); }

let errors = [], warns = [];
for (const f of files) { const r = scanFile(f); errors.push(...r.errors); warns.push(...r.warns); }

if (warns.length) {
  console.error(`內容守門 WARN（軟訊號 ${warns.length}，未達 3 層不擋）：`);
  for (const w of warns) console.error(`  · [${w.layer}] ${w.file}：${w.label}（${w.text}）`);
}
if (errors.length && !ALL) {
  console.error(`\n去 AI 味違規 ${errors.length} 處（擋 build）：`);
  for (const e of errors) console.error(`  ✗ ${e.loc} ${e.label}：${e.text}`);
  console.error(`\n改法見記憶 content-no-ai-flavor：AI 出初稿、人味靠最後 20% 手動微調。`);
  process.exit(1);
}
console.log(`內容守門通過：掃 ${files.length} 檔，無 AI 味 ERROR${warns.length ? `（${warns.length} 則 WARN 見上）` : ""}。`);
