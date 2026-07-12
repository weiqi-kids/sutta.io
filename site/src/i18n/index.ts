// i18n/index.ts — locale 解析（D-9）。預設 zh-Hant，英文於 /en/。
import { t as zhHant } from './zh-Hant';
import { en } from './en';
import type { Strings } from './zh-Hant';

export type Locale = 'zh-Hant' | 'en';

export function getStrings(locale: string | undefined): Strings {
  return locale === 'en' ? en : zhHant;
}

export function localeOf(locale: string | undefined): Locale {
  return locale === 'en' ? 'en' : 'zh-Hant';
}

/** 語言切換的對應網址：在 / 與 /en 前綴間切換同一頁。 */
export function altLocaleHref(pathname: string, current: Locale): string {
  // pathname 已含 BASE_URL；移除尾斜線比對，輸出前補回，與 canonical／sitemap 的正典形式對齊
  const clean = pathname.replace(/\/$/, '') || '/';
  const withSlash = (p: string) => (p === '/' ? p : `${p}/`);
  if (current === 'en') {
    // 去掉 /en 前綴 → 繁中
    return withSlash(clean.replace(/^\/en(\/|$)/, '/') || '/');
  }
  // 加 /en 前綴 → 英文
  return withSlash(clean === '/' ? '/en' : `/en${clean}`);
}

export type { Strings };
