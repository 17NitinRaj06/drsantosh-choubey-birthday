import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { registerWsRoute, getClients, saveAndBroadcastWish } from './ws.js';
import {
  getHistory, healthcheck, close as closeDb, startFlushLoop,
  isLiveEnabled,
  getDbCount, getHistoryFromDb,
} from './db.js';
import { setupAdminRoutes } from './admin.js';

const PORT = parseInt(process.env.PORT || '3001', 10);
const ALLOWED_ORIGIN_RAW = process.env.ALLOWED_ORIGIN || '*';
const ALLOWED_ORIGINS = ALLOWED_ORIGIN_RAW.split(',').map(s => s.trim()).filter(Boolean);

// ─── Rate limiting ───

const rateLimits = new Map<string, { windowStart: number; count: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(ip);
  if (!entry || now - entry.windowStart > 30000) {
    rateLimits.set(ip, { windowStart: now, count: 1 });
    return true;
  }
  entry.count++;
  return entry.count <= 1;
}

// ─── Fastify ───

const app = Fastify({
  logger: true,
  ignoreTrailingSlash: true,
});

await app.register(cors, {
  origin: (origin: string | undefined, cb: (...args: any[]) => void) => {
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGIN_RAW === '*') return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
});

await registerWsRoute(app);

// ─── Routes ───

app.get('/healthz', async () => {
  const health = await healthcheck();
  return { ...health, connections: getClients(), uptime: process.uptime() };
});

app.get('/api/live', async () => {
  return { enabled: isLiveEnabled() };
});

app.get('/api/messages', async (req, reply) => {
  const { before, limit } = req.query as { before?: string; limit?: string };
  const beforeSeq = before ? parseInt(before, 10) : undefined;
  const lim = limit ? Math.min(parseInt(limit, 10) || 50, 100) : 50;
  const messages = await getHistoryFromDb(beforeSeq, lim);
  return reply.send(messages);
});

app.get('/api/messages/count', async () => {
  const count = await getDbCount();
  return { count };
});

app.post('/api/messages', async (req, reply) => {
  if (!isLiveEnabled()) {
    return reply.code(423).send({ error: 'live_paused' });
  }

  const ip = req.ip;
  if (!checkRateLimit(ip)) {
    return reply.code(429).send({ error: 'Please wait 30 seconds before sending another wish.' });
  }

  const { name = '', department = '', message = '', website = '' } = (req.body as any) || {};

  if (website) return reply.send({ success: true });

  if (!message || !message.trim()) {
    return reply.code(400).send({ error: 'Message is required' });
  }

  const result = saveAndBroadcastWish({
    name,
    department: department || undefined,
    message,
    ipHash: 'rest',
  });

  if (!result) {
    return reply.code(400).send({ error: 'Message contains inappropriate content' });
  }

  return reply.send(result);
});

setupAdminRoutes(app);
startFlushLoop();

// ─── Start ───

await app.listen({ port: PORT, host: '0.0.0.0' });
console.log(`Server running on port ${PORT}`);
console.log(`Allowed origins: ${ALLOWED_ORIGIN_RAW}`);

// ─── Graceful shutdown ───

const shutdown = async () => {
  console.log('Shutting down...');
  await closeDb();
  await app.close();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
