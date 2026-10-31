import { readFile } from 'node:fs/promises';
import { createApplication } from './application.js';

const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be 1–65535');
const host = process.env.HOST ?? '127.0.0.1';
const certFile = process.env.TLS_CERT_FILE;
const keyFile = process.env.TLS_KEY_FILE;
if (Boolean(certFile) !== Boolean(keyFile)) throw new Error('Set both TLS_CERT_FILE and TLS_KEY_FILE');
const tls = certFile && keyFile ? { cert: await readFile(certFile), key: await readFile(keyFile) } : undefined;
const application = await createApplication({ dev: process.argv.includes('--dev'), tls, publicOrigin: process.env.APP_ORIGIN });

application.server.on('error', (error: NodeJS.ErrnoException) => {
  console.error(`Server failed to listen (${error.code ?? 'unknown error'}).`);
  process.exitCode = 1;
  void application.close();
});
application.server.listen(port, host, () => {
  console.log(`Sketchy Alibis: ${tls ? 'https' : 'http'}://${host}:${port}`);
});
let closing = false;
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    if (closing) return;
    closing = true;
    void application.close();
  });
}
