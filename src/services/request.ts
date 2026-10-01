import { API_BASE_URL } from './api';

export async function requestJson<T>(endpoint: string, signal?: AbortSignal): Promise<T> {
  const timeout = AbortSignal.timeout(15_000);
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    headers: { Accept: 'application/json' },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(typeof payload?.detail === 'string' ? payload.detail : `Data request failed (${response.status}). Please retry.`);
  if (payload === null) throw new Error('The data service returned an invalid response.');
  return payload as T;
}
