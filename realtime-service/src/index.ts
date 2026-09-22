import 'dotenv/config';
import crypto from 'crypto';
import { ObjectId } from 'mongodb';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { attachWs, startBroadcastLoop, broadcastMessage, getClients } from './ws.js';
import {
  getHistory, healthcheck, close as closeDb, startFlushLoop,
  isLiveEnabled, nextSeq, addToBuffer, enqueueWrite, hasClientId,
  getDbCount, getHistoryFromDb,
} from './db.js';
import type { WishDocument } from './db.js';
import { setupAdminRoutes } from './admin.js';
import { containsProfanity } from './profanity.js';

const PORT = parseInt(process.env.PORT || '3001', 10);
const ALLOWED_ORIGIN_RAW = process.env.ALLOWED_ORIGIN || '*';
const ALLOWED_ORIGINS = ALLOWED_ORIGIN_RAW.split(',').map(s => s.trim()).filter(Boolean);

// ─── Rate limiting ───

const rateLimits = new Map<string, { windowStart: number; count: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(ip);
  if (!entry || now - entry.windowStart > 60000) {
    rateLimits.set(ip, { windowStart: now, count: 1 });
    return true;
  }
  entry.count++;
  return entry.count <= 3;
}

function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '');
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

const wss = attachWs(app.server);

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
    return reply.code(429).send({ error: 'Rate limit. Max 3 messages per minute.' });
  }

  let { name = '', department = '', message = '', website = '' } = (req.body as any) || {};

  if (website) return reply.send({ success: true });

  name = stripHtml(name).trim().slice(0, 100);
  department = stripHtml(department).trim().slice(0, 100);
  message = stripHtml(message).trim();

  if (!message) return reply.code(400).send({ error: 'Message is required' });

  const encoder = new TextEncoder();
  const byteLen = encoder.encode(message).length;
  if (byteLen > 720) {
    message = new TextDecoder().decode(encoder.encode(message).slice(0, 720));
  }

  if (containsProfanity(message) || containsProfanity(name)) {
    return reply.code(400).send({ error: 'Message contains inappropriate content' });
  }

  const clientId = crypto.randomUUID();
  const seq = nextSeq();
  const doc: WishDocument = {
    _id: new ObjectId(),
    seq,
    clientId,
    name,
    department: department || null,
    message,
    status: 'visible',
    createdAt: new Date(),
    ipHash: 'rest',
  };

  // Idempotency: skip if clientId already in buffer
  if (hasClientId(clientId)) {
    return reply.send({ success: true });
  }

  addToBuffer(doc);
  enqueueWrite(doc);

  const broadcast = {
    seq,
    name: doc.name,
    department: doc.department,
    message: doc.message,
    createdAt: doc.createdAt.toISOString(),
    lane: 0,
  };
  broadcastMessage(broadcast);

  return reply.send({
    id: String(doc._id),
    seq,
    name: doc.name,
    department: doc.department,
    message: doc.message,
    createdAt: doc.createdAt.toISOString(),
  });
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
  wss.close();
  await closeDb();
  await app.close();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
