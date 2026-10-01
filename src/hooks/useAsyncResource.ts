import { useState, useEffect, useCallback } from 'react';
export function useAsyncResource<T>(fetcher: () => Promise<T>, enabled = true) {
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<{ fetcher: typeof fetcher; version: number; data: T | null; error: string | null } | null>(null);
  const refresh = useCallback(() => setVersion(v => v + 1), []);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    fetcher().then(data => { if (active) setResult({ fetcher, version, data, error: null }); })
      .catch(err => { if (active) setResult({ fetcher, version, data: null, error: err instanceof Error ? err.message : 'Data unavailable.' }); });
    return () => { active = false; };
  }, [fetcher, version, enabled]);
  const current = enabled && result?.fetcher === fetcher && result.version === version ? result : null;
  return { data: current?.data ?? null, error: current?.error ?? null, loading: enabled && !current, refresh };
}
