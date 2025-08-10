import { parse } from 'tldts';

export function isValidAcoupUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (!['http:', 'https:'].includes(u.protocol)) return false;
    const info = parse(u.hostname);
    return !!info.domain && info.domain === 'acoup.blog';
  } catch {
    return false;
  }
}

export async function fetchWithTimeout(url: string, init?: RequestInit): Promise<string> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`Upstream responded ${res.status}`);
  }
  return await res.text();
}

export async function fetchJsonWithTimeout<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`Upstream responded ${res.status}`);
  }
  return (await res.json()) as T;
}
