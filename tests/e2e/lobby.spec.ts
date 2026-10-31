import { test, expect, type Browser, type Page } from '@playwright/test';

// Session credentials must not be captured in network traces or storage-state files.
test.use({ trace: 'off', screenshot: 'off' });
async function player(browser: Browser, url: string) {
  const context = await browser.newContext(); const page = await context.newPage(); page.setDefaultTimeout(5_000); await page.goto(url);
  await expect(page.getByRole('status')).toHaveText('Connected to the case desk');
  return { context, page };
}
async function create(page: Page, name: string) {
  await page.getByLabel('Your name').fill(name); await page.getByRole('button', { name: 'Create room', exact: true }).click();
  await expect(page.getByLabel('Room code', { exact: true })).toBeVisible();
  return (await page.getByLabel('Room code', { exact: true }).textContent())!;
}
async function join(page: Page, name: string, code: string) {
  await page.getByLabel('Your name').fill(name); await page.getByLabel('Code to join').fill(code);
  await page.getByRole('button', { name: 'Join room', exact: true }).click();
}

test('four separate sessions share a private lobby, owner controls and capacity checks', async ({ browser, baseURL }) => {
  const people = await Promise.all(Array.from({ length: 5 }, () => player(browser, baseURL!)));
  try {
    const host = people[0].page; const code = await create(host, 'Maya');
    await join(people[1].page, 'Leo', 'BAD'); await expect(people[1].page.getByRole('alert')).toContainText('Room unavailable');
    await join(people[1].page, 'maya', code); await expect(people[1].page.getByRole('alert')).toContainText('already taken');
    for (let i = 1; i < 4; i++) await join(people[i].page, ['Maya', 'Leo', 'Sam', 'You'][i], code);
    await expect(host.getByRole('list', { name: 'Players' }).getByRole('listitem')).toHaveCount(4);
    await join(people[4].page, 'Fifth', code); await expect(people[4].page.getByRole('alert')).toHaveText('Room full.');
    for (const p of people.slice(0, 4)) {
      await expect(p.page.getByLabel('Room code', { exact: true })).toHaveText(code);
      await p.page.getByRole('button', { name: 'Ready', exact: true }).click();
    }
    await expect(people[1].page.getByRole('button', { name: 'Start case' })).toHaveCount(0);
    await expect(host.getByRole('button', { name: 'Start case' })).toBeEnabled();
    await expect(host.getByRole('list', { name: 'Players' }).getByRole('listitem')).toHaveCount(4);
    await host.getByRole('button', { name: 'Remove Sam', exact: true }).click();
    await expect(people[2].page.getByRole('alert')).toContainText('Room unavailable');
    await expect(host.getByRole('list', { name: 'Players' }).getByRole('listitem')).toHaveCount(3);
    await expect(host.getByRole('button', { name: 'Start case' })).toBeDisabled();
    await host.getByRole('button', { name: 'Close room and leave' }).click();
    await expect(people[1].page.getByRole('heading', { name: 'Room closed' })).toBeVisible();
    const cookies = await people[0].context.cookies();
    expect(cookies.find(c => c.name === '__Host-sketchy-session')).toMatchObject({ httpOnly: true, secure: true, sameSite: 'Strict' });
    expect(await host.evaluate(() => document.cookie)).not.toContain('sketchy-session');
  } finally { await Promise.allSettled(people.map(p => p.context.close())); }
});

test('refresh and reconnect preserve identity; a second tab requires explicit takeover and cannot ping-pong', async ({ browser, baseURL }) => {
  const host = await player(browser, baseURL!), guest = await player(browser, baseURL!);
  try {
    const code = await create(host.page, 'Maya'); await join(guest.page, 'Leo', code);
    await host.page.getByRole('button', { name: 'Ready', exact: true }).click();
    await host.page.goto('about:blank');
    await expect(guest.page.getByRole('list', { name: 'Players' })).toContainText('Disconnected');
    await host.page.goto(baseURL!); await expect(host.page.getByText('You are Maya (host)', { exact: true })).toBeVisible();
    await expect(host.page.getByRole('button', { name: 'Ready', exact: true })).toHaveAttribute('aria-pressed', 'false');
    await host.page.reload(); await expect(host.page.getByText('You are Maya (host)', { exact: true })).toBeVisible();
    const second = await host.context.newPage(); await second.goto(baseURL!);
    await expect(second.getByRole('button', { name: 'Resume here' })).toBeVisible();
    await second.getByRole('button', { name: 'Resume here' }).click();
    await expect(second.getByText('You are Maya (host)', { exact: true })).toBeVisible();
    await expect(host.page.getByRole('alert')).toHaveText('Session opened elsewhere.');
    await host.page.reload(); await expect(host.page.getByRole('alert')).toHaveText('Session opened elsewhere.');
    await second.getByRole('button', { name: 'Ready', exact: true }).click();
    await expect(second.getByRole('button', { name: 'Ready', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await host.page.getByRole('button', { name: 'Resume here' }).click();
    await expect(second.getByRole('alert')).toHaveText('Session opened elsewhere.');
    await expect(host.page.getByLabel('Room code', { exact: true })).toHaveText(code);
    await expect(guest.page.getByRole('list', { name: 'Players' }).getByRole('listitem')).toHaveCount(2);
  } finally { await Promise.allSettled([host.context.close(), guest.context.close()]); }
});

test('player-supplied markup renders as text', async ({ browser, baseURL }) => {
  const p = await player(browser, baseURL!);
  try {
    await create(p.page, '<b>Maya</b>');
    await expect(p.page.getByText('You are <b>Maya</b> (host)', { exact: true })).toBeVisible();
    await expect(p.page.locator('b')).toHaveCount(0);
  } finally { await p.context.close(); }
});

test('lost Ready acknowledgement resumes identity before retry and does not reapply readiness', async ({ browser, baseURL }) => {
  const hostContext = await browser.newContext(); const host = await hostContext.newPage();
  const guest = await player(browser, baseURL!); let dropped = false;
  await host.routeWebSocket('**/socket.io/**', route => {
    const server = route.connectToServer(); let readyAck: string | undefined;
    route.onMessage(message => {
      if (typeof message === 'string' && /^42\d+\[/.test(message)) {
        const [event, payload] = JSON.parse(message.slice(message.indexOf('[')));
        if (event === 'lobby:action' && payload.type === 'ready') readyAck = /^42(\d+)\[/.exec(message)![1];
      }
      server.send(message);
    });
    server.onMessage(message => {
      if (!dropped && readyAck && typeof message === 'string' && message.startsWith(`43${readyAck}[`)) { dropped = true; return; }
      route.send(message);
    });
  });
  try {
    await host.goto(baseURL!); await expect(host.getByRole('status')).toHaveText('Connected to the case desk');
    const code = await create(host, 'Maya'); await join(guest.page, 'Leo', code);
    await host.getByRole('button', { name: 'Ready', exact: true }).click();
    await expect(host.getByRole('button', { name: 'Ready', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => dropped).toBe(true);
    await host.goto('about:blank'); await expect(guest.page.getByRole('list', { name: 'Players' })).toContainText('Disconnected');
    await host.goto(baseURL!); await expect(host.getByText('You are Maya (host)', { exact: true })).toBeVisible();
    await expect(host.getByRole('button', { name: 'Ready', exact: true })).toBeEnabled();
    await expect(host.getByRole('button', { name: 'Ready', exact: true })).toHaveAttribute('aria-pressed', 'false');
    await expect(host.getByRole('button', { name: 'Retry pending request' })).toHaveCount(0);
  } finally { await Promise.allSettled([hostContext.close(), guest.context.close()]); }
});
