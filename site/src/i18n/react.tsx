// react.tsx — React island 的 i18n context（D-9）。
// islands 用 useI18n() 取字串；頂層 island 由頁面以 lang prop 包 I18nProvider。
import { createContext, useContext, type ReactNode } from 'react';
import { getStrings, type Strings } from './index';

const Ctx = createContext<Strings>(getStrings('zh-Hant'));

export function I18nProvider({ lang, children }: { lang?: string; children: ReactNode }) {
  return <Ctx.Provider value={getStrings(lang)}>{children}</Ctx.Provider>;
}

export function useI18n(): Strings {
  return useContext(Ctx);
}
