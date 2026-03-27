import { kv as rawKv } from '@vercel/kv';

export interface KvClient {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, options?: { ex?: number }): Promise<unknown>;
  del(key: string): Promise<unknown>;
  mget<T>(...keys: string[]): Promise<(T | null)[]>;
  scanIterator(options?: { match?: string; count?: number }): AsyncIterable<string>;
}

export const kv = rawKv as unknown as KvClient;

export async function setKvWithTtl(
  key: string,
  ttlSeconds: number,
  value: unknown
): Promise<void> {
  await kv.set(key, value, { ex: ttlSeconds });
}

export async function listKvKeys(match: string): Promise<string[]> {
  const keys: string[] = [];

  for await (const key of kv.scanIterator({ match })) {
    keys.push(key);
  }

  return keys;
}
