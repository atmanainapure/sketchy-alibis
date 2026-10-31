import { createApplication } from '../../src/server/application';
import { browserCase } from './browser-case-pack';

// Local-only technical demo. Not imported by either production build; no remote
// switch can select this fixture, change time or choose an assignment.
const app = await createApplication({ caseSource: browserCase });
app.server.listen(3001, '127.0.0.1', () => {
  console.info('Synthetic software rehearsal: http://127.0.0.1:3001');
  console.info('Use four separate browser profiles. Normal time and random assignments.');
  console.info('Dummy case stories; licensed photo. A10 is still pending. This is not the approved game case.');
});
app.server.on('error', async () => { console.error('Could not start the local rehearsal. Check whether port 3001 is in use.'); await app.close(); process.exitCode = 1; });
let closing = false;
async function close() { if (!closing) { closing = true; await app.close(); } }
process.once('SIGINT', () => { void close(); });
process.once('SIGTERM', () => { void close(); });
