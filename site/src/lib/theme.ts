// theme.ts — 非 CSS 表面（<meta name="theme-color"> 等）讀不到 CSS 變數，只能給字面色值。
// 此值＝src/styles/variables.css 的 --paper（淺色 oklch(0.908 0.028 86.6)）之 sRGB 鏡像；
// 改 --paper 時同步改這裡（同 quote-card.mjs canvas 色盤鏡像慣例）。
export const THEME_COLOR = '#E9E0CC';
