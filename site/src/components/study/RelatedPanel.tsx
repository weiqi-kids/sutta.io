import { useState } from 'react';
import { useI18n } from '../../i18n/react';
import type { SuttaContextData } from '../../lib/data';

interface EntityLink {
  key: string;
  name_pali: string;
  name_zh?: string;
}
interface TopicLink {
  slug: string;
  title: string;
  question: string;
}
interface Props {
  suttaId: string;
  context: SuttaContextData | null;
  hasAgama: boolean;
  entities: EntityLink[];
  topics?: TopicLink[];
  baseUrl: string;
}

// SITE_IA §6 研經頁「相關」交叉引用區（可摺疊）：此經談到的主題 + 此經背景(L1) + 阿含對照註 + 其他語言平行 + 人地事連結。
export default function RelatedPanel({ suttaId, context, hasAgama, entities, topics = [], baseUrl }: Props) {
  const t = useI18n();
  const [open, setOpen] = useState(false);
  const url = (p: string) => `${baseUrl}${p}` || '/';
  // 「本經談到的主題」反向鏈改由 read/[sutta].astro 靜態渲染（可被爬取），此處不重複。
  void topics;
  const hasAnything = context || hasAgama || entities.length > 0;
  if (!hasAnything) return null;

  return (
    <section className="related-panel">
      <button className="related-toggle" type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {t.study.related} {open ? '▾' : '▸'}
      </button>
      {open && (
        <div className="related-body">
          {context && (
            <div className="related-block">
              <h3 className="related-h">
                {t.study.background}
                <span className="prov-tag prov-canonical">{t.study.provCanonical}</span>
              </h3>
              <dl className="related-grid">
                {context.setting_place && (
                  <>
                    <dt>{t.study.bgPlace}</dt>
                    <dd>{context.setting_place}</dd>
                  </>
                )}
                {context.audience && (
                  <>
                    <dt>{t.study.bgAudience}</dt>
                    <dd>{context.audience}</dd>
                  </>
                )}
                {context.occasion && (
                  <>
                    <dt>{t.study.bgOccasion}</dt>
                    <dd>{context.occasion}</dd>
                  </>
                )}
              </dl>
              {context.derived_from.length > 0 && (
                <p className="related-derived calm-note">
                  {t.study.bgDerivedFrom}：
                  {context.derived_from.map((seg, i) => (
                    <span key={seg}>
                      {i > 0 && '、'}
                      <a href={`#${seg}`} className="data">
                        {seg}
                      </a>
                    </span>
                  ))}
                </p>
              )}
            </div>
          )}

          {entities.length > 0 && (
            <div className="related-block">
              <h3 className="related-h">{t.study.relatedEntities}</h3>
              <ul className="related-entities">
                {entities.map((e) => (
                  <li key={e.key}>
                    <a href={url(`/lexicon/${e.key}`)} lang="pi">
                      {e.name_pali}
                    </a>
                    {e.name_zh && <span className="calm-note">（{e.name_zh}）</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hasAgama && (
            <div className="related-block">
              <h3 className="related-h">{t.study.crossAgama}</h3>
              <p className="calm-note">{t.study.crossAgamaNote}</p>
            </div>
          )}

          <div className="related-block">
            <h3 className="related-h">{t.study.otherParallels}</h3>
            <a className="related-sc" href={`https://suttacentral.net/${suttaId}/pli/ms`} target="_blank" rel="noopener">
              {t.study.viewOnSC}
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
