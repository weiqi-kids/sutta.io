import { useEffect, useState } from 'react';
import type { ColumnCLayout } from '@tipitaka/contracts';

export type LayoutMode = 'three' | 'two-drawer' | 'tabs';

// 斷點（SITE_IA §8 / STUDY_PAGE §1）：桌機≥1024 三欄 | 平板640–1023 兩欄+抽屜 | 手機<640 頁籤
export function useLayoutMode(): LayoutMode {
  const [mode, setMode] = useState<LayoutMode>('three');
  useEffect(() => {
    const compute = (): LayoutMode => {
      const w = window.innerWidth;
      if (w >= 1024) return 'three';
      if (w >= 640) return 'two-drawer';
      return 'tabs';
    };
    const update = () => setMode(compute());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return mode;
}

export function columnCLayoutFor(mode: LayoutMode): ColumnCLayout {
  if (mode === 'three') return 'inline';
  if (mode === 'two-drawer') return 'drawer';
  return 'tab';
}
