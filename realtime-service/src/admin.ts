import crypto from 'crypto';
import type { FastifyInstance } from 'fastify';
import { hideMessage, deleteMessageBySeq, exportAll, getAllMessagesFromDb, isLiveEnabled, setLiveState, type WishDocument } from './db.js';
import { broadcastRemoval, broadcastLiveState } from './ws.js';

// ─── Rate limiting ───

const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

function getAttempts(ip: string): { count: number; resetAt: number } {
  const entry = loginAttempts.get(ip);
  if (!entry) return { count: 0, resetAt: 0 };
  if (Date.now() > entry.resetAt) {
    loginAttempts.delete(ip);
    return { count: 0, resetAt: 0 };
  }
  return entry;
}

function recordAttempt(ip: string): { count: number; resetAt: number } {
  const entry = getAttempts(ip);
  entry.count++;
  entry.resetAt = Date.now() + RATE_LIMIT_WINDOW_MS;
  loginAttempts.set(ip, entry);
  return entry;
}

// ─── Session tokens ───

const sessionTokens = new Map<string, { createdAt: number; expiresAt: number }>();
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000;

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function verifyToken(token: string): boolean {
  const session = sessionTokens.get(token);
  if (!session) return false;
  if (Date.now() > session.expiresAt) {
    sessionTokens.delete(token);
    return false;
  }
  return true;
}

// ─── Auth middleware ───

function requireAuth(req: any, reply: any): string | null {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    reply.code(401).send({ error: 'Authentication required' });
    return null;
  }
  const token = auth.slice(7);
  if (!verifyToken(token)) {
    reply.code(401).send({ error: 'Invalid or expired token' });
    return null;
  }
  return token;
}

// ─── CSV export helper ───

function toCsvRow(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function docsToCsv(docs: WishDocument[]): string {
  const header = 'seq,clientId,name,department,message,status,createdAt,ipHash';
  const rows = docs.map(d =>
    [
      d.seq,
      d.clientId,
      toCsvRow(d.name),
      toCsvRow(d.department || ''),
      toCsvRow(d.message),
      d.status,
      d.createdAt.toISOString(),
      d.ipHash,
    ].join(',')
  );
  return [header, ...rows].join('\n');
}

// ─── Setup routes ───

export function setupAdminRoutes(app: FastifyInstance): void {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error('ADMIN_PASSWORD is not set — admin routes are disabled');
    return;
  }

  console.log('Admin routes registered: POST /api/admin/login, GET /api/admin/messages, GET /api/admin/export, PATCH /api/admin/messages/:id/hide, DELETE /api/admin/messages/:id, GET /api/admin/live, POST /api/admin/live');

  // ─── Login ───
  app.post('/api/admin/login', async (req: any, reply: any) => {
    const ip = req.ip;
    const attempts = getAttempts(ip);
    if (attempts.count >= RATE_LIMIT_MAX) {
      const retryAfter = Math.ceil((attempts.resetAt - Date.now()) / 1000);
      reply.header('Retry-After', String(retryAfter));
      return reply.code(429).send({ error: `Too many attempts, try again in ${retryAfter} seconds` });
    }

    const { password } = (req.body as any) || {};
    if (!password) return reply.code(400).send({ error: 'Password required' });

    recordAttempt(ip);

    const passwordBuf = Buffer.from(password);
    const expectedBuf = Buffer.from(adminPassword);
    if (passwordBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(passwordBuf, expectedBuf)) {
      return reply.code(401).send({ error: 'Wrong password' });
    }

    loginAttempts.delete(ip);
    const token = generateToken();
    sessionTokens.set(token, { createdAt: Date.now(), expiresAt: Date.now() + TOKEN_TTL_MS });
    console.log(`Admin login successful from ${ip}`);
    return reply.send({ token, expiresIn: TOKEN_TTL_MS });
  });

  // ─── List messages (admin — includes hidden) ───
  app.get('/api/admin/messages', async (req: any, reply: any) => {
    if (!requireAuth(req, reply)) return;
    return reply.send(await getAllMessagesFromDb());
  });

  // ─── Export ───
  app.get('/api/admin/export', async (req: any, reply: any) => {
    if (!requireAuth(req, reply)) return;
    const format = (req.query as any)?.format;
    const docs = await exportAll();
    if (format === 'csv') {
      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', 'attachment; filename="messages-export.csv"');
      return reply.send(docsToCsv(docs));
    }
    reply.header('Content-Type', 'application/json');
    reply.header('Content-Disposition', 'attachment; filename="messages-export.json"');
    return reply.send(docs);
  });

  // ─── Toggle hide ───
  app.patch('/api/admin/messages/:id/hide', async (req: any, reply: any) => {
    if (!requireAuth(req, reply)) return;
    const { id } = req.params as any;
    const seq = parseInt(id, 10);
    if (isNaN(seq)) return reply.code(400).send({ error: 'Invalid seq' });
    const updated = await hideMessage(seq);
    if (!updated) return reply.code(404).send({ error: 'Message not found' });
    broadcastRemoval('hide', seq);
    return reply.send({ seq: updated.seq, status: updated.status });
  });

  // ─── Delete ───
  app.delete('/api/admin/messages/:id', async (req: any, reply: any) => {
    if (!requireAuth(req, reply)) return;
    const { id } = req.params as any;
    const seq = parseInt(id, 10);
    if (isNaN(seq)) return reply.code(400).send({ error: 'Invalid seq' });
    const deleted = await deleteMessageBySeq(seq);
    if (!deleted) return reply.code(404).send({ error: 'Message not found' });
    broadcastRemoval('delete', seq);
    return reply.send({ success: true });
  });

  // ─── Get live state ───
  app.get('/api/admin/live', async (req: any, reply: any) => {
    if (!requireAuth(req, reply)) return;
    return reply.send({ enabled: isLiveEnabled() });
  });

  // ─── Set live state ───
  app.post('/api/admin/live', async (req: any, reply: any) => {
    if (!requireAuth(req, reply)) return;
    const { enabled } = (req.body as any) || {};
    if (typeof enabled !== 'boolean') {
      return reply.code(400).send({ error: 'enabled must be a boolean' });
    }
    await setLiveState(enabled, req.ip);
    broadcastLiveState(enabled);
    return reply.send({ enabled });
  });

  // ─── Cleanup expired tokens ───
  setInterval(() => {
    const now = Date.now();
    for (const [token, session] of sessionTokens) {
      if (now > session.expiresAt) sessionTokens.delete(token);
    }
  }, 60 * 60 * 1000);
}
