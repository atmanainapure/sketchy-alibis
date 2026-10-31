import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import type { UserConfig } from 'vite';
import { clientBoundary } from './client-boundary.ts';

export function clientConfig(projectRoot: string): UserConfig {
  const client = resolve(projectRoot, 'src/client');
  const shared = resolve(projectRoot, 'src/shared');
  const dependencies = resolve(projectRoot, 'node_modules');
  return {
    root: client,
    publicDir: false,
    plugins: [clientBoundary([client, shared, dependencies]), react()],
    appType: 'custom',
    build: {
      outDir: resolve(projectRoot, 'dist/client'),
      emptyOutDir: true,
      sourcemap: false,
    },
    server: { fs: { strict: true, allow: [client, shared, dependencies] } },
  };
}
