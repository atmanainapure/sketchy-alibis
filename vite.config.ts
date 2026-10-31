import { fileURLToPath } from 'node:url';
import { clientConfig } from './tooling/client-config.ts';

export default clientConfig(fileURLToPath(new URL('.', import.meta.url)));
