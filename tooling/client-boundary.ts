import { realpathSync } from 'node:fs';
import { isAbsolute, relative, sep } from 'node:path';
import type { Plugin } from 'vite';

function canonical(path: string) {
  try { return realpathSync(path); } catch { return path; }
}

export function clientBoundary(allowedRoots: string[]): Plugin {
  const roots = allowedRoots.map(canonical);
  return {
    name: 'sketchy-alibis-client-boundary',
    enforce: 'pre',
    load(id) {
      const filename = id.split(/[?#]/, 1)[0];
      if (!isAbsolute(filename)) return null; // Vite virtual modules are not files.
      const path = canonical(filename);
      const allowed = roots.some(root => {
        const fromRoot = relative(root, path);
        return fromRoot === '' || (fromRoot !== '..' && !fromRoot.startsWith(`..${sep}`) && !isAbsolute(fromRoot));
      });
      if (!allowed) this.error('Browser boundary: imports must stay in src/client, src/shared, or node_modules.');
      return null;
    },
  };
}
