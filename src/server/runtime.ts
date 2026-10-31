import { randomInt } from 'node:crypto';

// Passed directly to server/game factories in tests, never selected by a request.
export interface ServerRuntime {
  now(): number;
  schedule(callback: () => void, delayMs: number): () => void;
  randomInt(exclusiveMaximum: number): number;
}

export const systemRuntime: ServerRuntime = {
  now: () => Date.now(),
  schedule(callback, delayMs) {
    const timer = setTimeout(callback, delayMs);
    return () => clearTimeout(timer);
  },
  randomInt,
};
