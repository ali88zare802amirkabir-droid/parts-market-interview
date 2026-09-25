"use client";

import * as React from "react";

interface State<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Fetch a JSON API endpoint with credentials and expose
 * data / loading / error states. `refresh` re-runs the request.
 */
export function useJson<T>(url: string | null, deps: React.DependencyList = []) {
  const [state, setState] = React.useState<State<T>>({
    data: null,
    loading: Boolean(url),
    error: null,
  });
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetch(url, { credentials: "same-origin" })
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(json?.error ?? "خطا در دریافت اطلاعات.");
        }
        return json.data as T;
      })
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((err: Error) => {
        if (!cancelled) setState({ data: null, loading: false, error: err.message });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, tick, ...deps]);

  const refresh = React.useCallback(() => setTick((t) => t + 1), []);
  return { ...state, refresh };
}