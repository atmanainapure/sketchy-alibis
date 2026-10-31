import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { ServerRuntime } from '../runtime.js';

export const SESSION_COOKIE = '__Host-sketchy-session';
export const HOUR = 60 * 60 * 1000;
export interface PlayerSession { id: string; expiresAt: number }

export class Sessions {
  private records = new Map<string, PlayerSession>();
  private limits = new Map<string, { until: number; count: number }>();
  constructor(private runtime: ServerRuntime) {}

  sweep() {
    const now = this.runtime.now();
    for (const [key, session] of this.records) if (session.expiresAt <= now) this.records.delete(key);
    for (const [key, limit] of this.limits) if (limit.until <= now) this.limits.delete(key);
  }

  allow(key: string, maximum: number) {
    this.sweep();
    let bucket = this.limits.get(key);
    if (!bucket) {
      if (this.limits.size >= 2048) return false;
      bucket = { until: this.runtime.now() + 60_000, count: 0 };
      this.limits.set(key, bucket);
    }
    return ++bucket.count <= maximum;
  }

  get(cookie: string | undefined) {
    this.sweep();
    const values = (cookie ?? '').split(';').map(part => part.trim()).filter(part => part.startsWith(`${SESSION_COOKIE}=`));
    if (values.length !== 1) return undefined;
    const token = values[0].slice(SESSION_COOKIE.length + 1);
    if (!/^[\w-]{43}$/.test(token)) return undefined;
    return this.records.get(createHash('sha256').update(token).digest('hex'));
  }

  create() {
    this.sweep();
    if (this.records.size >= 512) return undefined;
    const token = randomBytes(32).toString('base64url');
    const session = { id: randomUUID(), expiresAt: this.runtime.now() + HOUR };
    this.records.set(createHash('sha256').update(token).digest('hex'), session);
    return { token, session };
  }

  revoke(id: string) {
    for (const [key, session] of this.records) if (session.id === id) this.records.delete(key);
  }
}
