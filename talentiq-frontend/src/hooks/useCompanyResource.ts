import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

export interface CompanyPageMeta { currentPage: number; totalPages: number; totalElements: number; pageSize: number }
export interface CompanyResponse<T> { data: T; page?: CompanyPageMeta }

/** Component-local data: cancelled on navigation, never shared between accounts. */
export function useCompanyResource<T>(url: string | null) {
  const { user } = useAuth();
  const userId = user?.id;
  const [result, setResult] = useState<{ key: string; response: CompanyResponse<T> | null; error: string; loading: boolean }>({ key: '', response: null, error: '', loading: true });
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  const key = `${userId ?? ''}:${url ?? ''}`;
  useEffect(() => {
    if (!url || !userId) return;
    const controller = new AbortController();
    setResult({ key, response: null, error: '', loading: true });
    apiClient.get<CompanyResponse<T>>(url, { signal: controller.signal }).then(res => {
      if (!controller.signal.aborted) setResult({ key, response: res.data, error: '', loading: false });
    }).catch(error => {
      if (!controller.signal.aborted) setResult({ key, response: null, error: error?.response?.data?.message || 'Unable to load this information. Please try again.', loading: false });
    });
    return () => controller.abort();
  }, [url, key, revision, userId]);
  const current = result.key === key ? result : null;
  return { data: current?.response?.data ?? null, page: current?.response?.page, error: current?.error ?? '', loading: Boolean(url) && (current?.loading ?? true), refresh };
}

export function useCompanyDebounce(value: string, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const timer = window.setTimeout(() => setDebounced(value), delay); return () => window.clearTimeout(timer); }, [value, delay]);
  return debounced;
}
