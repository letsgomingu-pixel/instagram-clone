import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { applyMeta } from './applyMeta';
import { matchRouteMeta } from './routes';
import type { SeoOverride } from './types';

interface SeoContextValue {
  setOverride: (meta: SeoOverride | null) => void;
}

const SeoContext = createContext<SeoContextValue>({ setOverride: () => undefined });

function compact(meta: SeoOverride | null): SeoOverride {
  if (!meta) return {};
  return Object.fromEntries(Object.entries(meta).filter(([, value]) => value !== undefined)) as SeoOverride;
}

export function SeoProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [overridePath, setOverridePath] = useState(pathname);
  const [override, setOverride] = useState<SeoOverride | null>(null);

  if (overridePath !== pathname) {
    setOverridePath(pathname);
    setOverride(null);
  }

  const routeMeta = useMemo(() => matchRouteMeta(pathname), [pathname]);
  const merged = useMemo(() => ({ ...routeMeta, ...compact(override) }), [routeMeta, override]);

  useEffect(() => {
    applyMeta(pathname, merged);
  }, [pathname, merged]);

  const value = useMemo(() => ({ setOverride }), []);

  return <SeoContext.Provider value={value}>{children}</SeoContext.Provider>;
}

export function useSeo(meta: SeoOverride) {
  const { setOverride } = useContext(SeoContext);
  const serialized = JSON.stringify(meta);

  useEffect(() => {
    setOverride(JSON.parse(serialized) as SeoOverride);
    return () => setOverride(null);
  }, [serialized, setOverride]);
}
