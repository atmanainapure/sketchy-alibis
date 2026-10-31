import { readFile } from 'node:fs/promises';
import { createServer as createHttpServer } from 'node:http';
import { createServer as createHttpsServer, type ServerOptions } from 'node:https';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { IncomingMessage } from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { Server } from 'socket.io';
import type { ViteDevServer } from 'vite';
import { healthSchema } from '../shared/connection.js';
import { systemRuntime, type ServerRuntime } from './runtime.js';
import { Sessions, SESSION_COOKIE } from './rooms/sessions.js';
import { Rooms, roomFailure, type GamePort } from './rooms/authority.js';
import { actionSchema, connectSchema, enterSchema, readSchema, type Reply } from '../shared/lobby.js';
import { case001 } from './content/case-001.js';
import { CaseGames } from './game/authority.js';
import { gameRequestSchema } from '../shared/game.js';

interface ApplicationOptions {
  dev?: boolean;
  tls?: Pick<ServerOptions, 'key' | 'cert'>;
  runtime?: ServerRuntime;
  publicOrigin?: string;
  game?: GamePort;
  caseSource?: () => unknown;
}

export async function createApplication(options: ApplicationOptions = {}) {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const runtime = options.runtime ?? systemRuntime;
  const sessions = new Sessions(runtime);
  if (options.publicOrigin) {
    const url = new URL(options.publicOrigin);
    const permittedProtocol = url.protocol === 'https:' || (url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname));
    if (url.origin !== options.publicOrigin || !permittedProtocol) throw new Error('APP_ORIGIN must be an exact HTTPS origin (HTTP allowed on loopback only)');
  }
  const app = express();
  app.disable('x-powered-by');
  app.use((_request, response, next) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('X-Frame-Options', 'DENY');
    next();
  });
  app.get('/api/health', (_request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.json(healthSchema.parse({ status: 'ok', serverTime: runtime.now() }));
  });

  const server = options.tls ? createHttpsServer(options.tls, app) : createHttpServer(app);
  const protocol = options.tls ? 'https' : 'http';
  function sameOrigin(request: IncomingMessage) {
    const origin = request.headers.origin;
    if (!origin) return false;
    if (options.publicOrigin) return origin === options.publicOrigin && request.headers.host === new URL(options.publicOrigin).host;
    const address = server.address() as AddressInfo | null;
    return ['127.0.0.1', 'localhost'].some(host => origin === `${protocol}://${host}:${address?.port}` && request.headers.host === `${host}:${address?.port}`);
  }
  app.post('/api/session', (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    if (!sameOrigin(request) || !request.is('application/json')) { response.status(403).json({ error: 'Request denied' }); return; }
    if (!sessions.allow(`bootstrap:${request.socket.remoteAddress}`, 60)) { response.status(429).json({ error: 'Try again later' }); return; }
    rooms.sweep();
    let session = sessions.get(request.headers.cookie);
    if (!session) {
      const created = sessions.create();
      if (!created) { response.status(429).json({ error: 'Try again later' }); return; }
      session = created.session;
      // The browser's opaque token may outlive its server authorization. Server
      // expiry/revocation is always checked; a late room must not lose its cookie early.
      response.cookie(SESSION_COOKIE, created.token, { httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: 7 * 24 * 60 * 60 * 1000 });
    }
    response.json({ hasMembership: rooms.hasMembership(session) });
  });
  const io = new Server(server, {
    maxHttpBufferSize: 64 * 1024,
    allowRequest(request, accept) {
      const origin = request.headers.origin;
      accept(null, origin === undefined || sameOrigin(request));
    },
  });
  const game = options.game ?? new CaseGames(runtime, options.caseSource ?? (() => case001), code => rooms.gameChanged(code));
  const rooms = new Rooms(runtime, sessions, (socketId, event, payload) => io.sockets.sockets.get(socketId)?.emit(event, payload), game);
  app.get('/api/rooms/:roomCode/cases/:caseId/photo', async (request, response) => {
    response.setHeader('Cache-Control', 'private, no-store');
    try {
      rooms.sweep();
      const session = sessions.get(request.headers.cookie);
      if (!session || (request.headers.origin && !sameOrigin(request)) || request.headers['sec-fetch-site'] === 'cross-site') throw Error('Unavailable');
      const filename = rooms.photo(session, request.params.roomCode, request.params.caseId);
      // Fixed allowlist: neither a URL nor a user/content-selected filesystem path.
      if (filename !== 'scene-001.jpg') throw Error('Unavailable');
      const bytes = await readFile(resolve(root, 'assets/private/case-001/scene-001.jpg'));
      response.setHeader('Content-Disposition', 'inline; filename="scene-001.jpg"');
      response.type('image/jpeg').send(bytes);
    } catch { response.status(404).json({ error: 'Not found' }); }
  });
  io.on('connection', socket => {
    type SocketReply = Reply | ReturnType<Rooms['gameRead']> | ReturnType<Rooms['gameAct']>;
    function handle<T>(event: string, schema: { safeParse(value: unknown): { success: true; data: T } | { success: false } }, run: (session: NonNullable<ReturnType<Sessions['get']>>, value: T) => SocketReply, limit = 120) {
      socket.on(event, (raw: unknown, acknowledgement: unknown) => {
        if (typeof acknowledgement !== 'function') return;
        if (!sessions.allow(`connection:${socket.id}`, 120)) { acknowledgement({ ok: false, error: 'TRY_LATER' }); return; }
        let reply: SocketReply;
        rooms.sweep();
        const session = sessions.get(socket.request.headers.cookie);
        if (!sameOrigin(socket.request) || !session) reply = { ok: false, error: 'UNAUTHENTICATED' };
        else {
          const parsed = schema.safeParse(raw);
          if (!parsed.success) reply = { ok: false, error: 'INVALID_REQUEST' };
          else if (!sessions.allow(`${event}:${session.id}`, limit)) reply = { ok: false, error: 'TRY_LATER' };
          else { try { reply = run(session, parsed.data); } catch (error) { reply = roomFailure(error); } }
        }
        acknowledgement(reply);
      });
    }
    handle('lobby:enter', enterSchema, (session, input) => rooms.enter(session, socket.id, input), 20);
    handle('lobby:connect', connectSchema, (session, input) => rooms.connect(session, socket.id, input), 60);
    handle('lobby:action', actionSchema, (session, input) => rooms.act(session, socket.id, input));
    handle('lobby:read', readSchema, (session, input) => rooms.read(session, socket.id, input.roomCode));
    handle('game:read', readSchema, (session, input) => rooms.gameRead(session, socket.id, input.roomCode));
    handle('game:action', gameRequestSchema, (session, input) => rooms.gameAct(session, socket.id, input));
    socket.on('disconnect', () => rooms.disconnect(socket.id));
  });
  let cancelSweep: () => void;
  const scheduleSweep = () => { cancelSweep = runtime.schedule(() => { rooms.sweep(); scheduleSweep(); }, 60_000); };
  scheduleSweep();

  let vite: ViteDevServer | undefined;
  if (options.dev) {
    const { createServer } = await import('vite');
    vite = await createServer({
      configFile: resolve(root, 'vite.config.ts'),
      configLoader: 'native',
      server: { middlewareMode: { server }, ws: { server } },
    });
    app.use(vite.middlewares);
    app.get('/', async (_request, response, next) => {
      try {
        const html = await readFile(resolve(root, 'src/client/index.html'), 'utf8');
        response.type('html').send(await vite!.transformIndexHtml('/', html));
      } catch (error) {
        next(error);
      }
    });
  } else {
    app.use(express.static(resolve(root, 'dist/client'), { dotfiles: 'deny', index: 'index.html' }));
  }
  app.use((_request, response) => { response.status(404).json({ error: 'Not found' }); });
  app.use((_error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    response.status(500).json({ error: 'Request failed' });
  });

  return {
    server,
    async close() {
      cancelSweep();
      rooms.close();
      await vite?.close();
      await new Promise<void>((resolveClose) => io.close(() => resolveClose()));
      server.closeAllConnections();
    },
  };
}
