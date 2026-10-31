import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, symlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { build } from 'vite';
import { clientConfig } from '../../tooling/client-config';

const fixtures: string[] = [];
const secret = 'SERVER_ONLY_CANARY_NOT_A_REAL_CASE';

async function fixture(entry: string, shared = 'export const value = "public title";') {
  const root = await mkdtemp(resolve('.tmp-boundary-'));
  fixtures.push(root);
  await Promise.all(['client', 'shared', 'server'].map(dir => mkdir(resolve(root, 'src', dir), { recursive: true })));
  await Promise.all([
    writeFile(resolve(root, 'src/client/index.html'), '<html><body><script type="module" src="/main.ts"></script></body></html>'),
    writeFile(resolve(root, 'src/client/main.ts'), entry),
    writeFile(resolve(root, 'src/shared/public.ts'), shared),
    writeFile(resolve(root, 'src/server/private.ts'), `export const value = "${secret}";`),
  ]);
  return root;
}

function bundle(root: string) {
  return build({ ...clientConfig(root), configFile: false, logLevel: 'silent' });
}

afterEach(async () => {
  await Promise.all(fixtures.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('browser build information boundary', () => {
  test('allows deliberately public shared data', async () => {
    const root = await fixture('import {value} from "../shared/public"; document.body.textContent = value;');
    await bundle(root);
    const assets = resolve(root, 'dist/client/assets');
    const output = (await Promise.all((await readdir(assets)).map(name => readFile(resolve(assets, name), 'utf8')))).join('\n');
    expect(output).toContain('public title');
    expect(output).not.toContain(secret);
  });

  test('rejects a direct server import before publishing a bundle', async () => {
    const root = await fixture('import {value} from "../server/private"; document.body.textContent = value;');
    await expect(bundle(root)).rejects.toThrow(/Browser boundary/);
  });

  test('rejects private data imported transitively through shared code', async () => {
    const root = await fixture('import {value} from "../shared/public"; document.body.textContent = value;', 'export {value} from "../server/private";');
    await expect(bundle(root)).rejects.toThrow(/Browser boundary/);
  });

  test('rejects raw server file imports', async () => {
    const root = await fixture('import value from "../server/private.ts?raw"; document.body.textContent = value;');
    await expect(bundle(root)).rejects.toThrow(/Browser boundary/);
  });

  test('rejects server content symlinked into the client directory', async () => {
    const root = await fixture('import {value} from "./shortcut"; document.body.textContent = value;');
    await symlink(resolve(root, 'src/server/private.ts'), resolve(root, 'src/client/shortcut.ts'));
    await expect(bundle(root)).rejects.toThrow(/Browser boundary/);
  });
});
