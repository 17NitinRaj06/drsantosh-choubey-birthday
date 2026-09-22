import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import crypto from 'crypto';
import { ObjectId } from 'mongodb';
import {
  nextSeq, addToBuffer, getBuffer, removeFromBuffer,
  updateBufferStatus, enqueueWrite, hasClientId, isLiveEnabled, type WishDocument,
} from './db.js';
import { containsProfanity } from './profanity.js';

// ─── Clients ───

const MAX_LANES = 25;
const clients = new Set<WebSocket>();
const lanes: (WebSocket | null)[] = new Array(MAX_LANES).fill(null);

function getLane(): number {
  for (let i = 0; i < MAX_LANES; i++) {
    if (!lanes[i]) return i;
  }
  return -1;
}

function releaseLane(idx: number): void {
  if (idx >= 0 && idx < MAX_LANES) lanes[idx] = null;
}

export function getClients(): number {
  return clients.size;
}

// ─── Broadcast ───

let broadcastTimer: ReturnType<typeof setInterval> | null = null;
let pendingBatch: any[] = [];

export function enqueueMessage(msg: any): void {
  pendingBatch.push(msg);
}

export function startBroadcastLoop(intervalMs = 200): void {
  if (broadcastTimer) return;
  broadcastTimer = setInterval(() => {
    if (!pendingBatch.length) return;
    const batch = pendingBatch.splice(0, pendingBatch.length);
    const payload = JSON.stringify({ type: 'messages', messages: batch });
    for (const ws of clients) {
      if (ws.readyState === WebSocket.OPEN) {
        try { ws.send(payload); } catch {}
      }
    }
  }, intervalMs);
}

export function broadcastMessage(msg: any): void {
  const payload = JSON.stringify({ type: 'messages', messages: [msg] });
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      try { ws.send(payload); } catch {}
    }
  }
}

export function broadcastRemoval(type: 'hide' | 'delete', seq: number): void {
  const payload = JSON.stringify({ type, seq });
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      try { ws.send(payload); } catch {}
    }
  }
}

export function broadcastLiveState(enabled: boolean): void {
  const payload = JSON.stringify({ type: 'live_state', enabled });
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      try { ws.send(payload); } catch {}
    }
  }
}

// ─── IP hashing ───

const IP_SALT = process.env.IP_SALT || 'birthday-tribute-2026';

function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(`${IP_SALT}:${ip}`).digest('hex').slice(0, 16);
}

// ─── Save wish to DB and broadcast to all WS clients (single code path) ───

export interface WishInput {
  name: string;
  department?: string;
  message: string;
  clientId?: string;
  ipHash?: string;
}

export interface WishResult {
  id: string;
  seq: number;
  name: string;
  department: string | null;
  message: string;
  createdAt: string;
}

export function saveAndBroadcastWish(input: WishInput): WishResult | null {
  const cleanName = input.name.toString().replace(/<[^>]*>/g, '').trim().slice(0, 100);
  const cleanDept = input.department ? input.department.toString().replace(/<[^>]*>/g, '').trim().slice(0, 100) : null;
  let cleanMsg = input.message.toString().replace(/<[^>]*>/g, '').trim();

  const encoder = new TextEncoder();
  const byteLen = encoder.encode(cleanMsg).length;
  if (byteLen > 720) {
    cleanMsg = new TextDecoder().decode(encoder.encode(cleanMsg).slice(0, 720));
  }

  if (containsProfanity(cleanMsg) || containsProfanity(cleanName)) return null;
  if (!cleanMsg) return null;

  const seq = nextSeq();
  const clientId = input.clientId || crypto.randomUUID();
  const doc: WishDocument = {
    _id: new ObjectId(),
    seq,
    clientId,
    name: cleanName,
    department: cleanDept,
    message: cleanMsg,
    status: 'visible',
    createdAt: new Date(),
    ipHash: input.ipHash || 'rest',
  };

  // Idempotency: skip if clientId already in buffer
  if (hasClientId(doc.clientId)) return null;

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

  return {
    id: String(doc._id),
    seq,
    name: doc.name,
    department: doc.department,
    message: doc.message,
    createdAt: doc.createdAt.toISOString(),
  };
}

// ─── Process incoming message from WS client ───

export function processWsMessage(data: string, ip: string): any | null {
  let parsed: any;
  try { parsed = JSON.parse(data); } catch { return null; }
  if (parsed.type !== 'message') return null;

  const { name = '', department = '', message = '', clientId = '' } = parsed.payload || {};
  if (!message || typeof message !== 'string') return null;

  return saveAndBroadcastWish({
    name: name.toString(),
    department: department ? department.toString() : undefined,
    message: message.toString(),
    clientId: clientId || undefined,
    ipHash: hashIp(ip),
  });
}

// ─── Attach WS server ───

export function attachWs(server: Server): WebSocketServer {
  const wss = new WebSocketServer({
    server,
    perMessageDeflate: false,
    path: '/ws',
  });

  wss.on('connection', (ws, req) => {
    const lane = getLane();
    (ws as any)._lane = lane;
    if (lane >= 0) lanes[lane] = ws;
    clients.add(ws);

    // Send init with lane and history from memory buffer
    const history = getBuffer().map(d => ({
      seq: d.seq,
      name: d.name,
      department: d.department,
      message: d.message,
      createdAt: d.createdAt.toISOString(),
      lane: 0,
    }));

    ws.send(JSON.stringify({
      type: 'init',
      lane,
      lanes: lanes.map((l, i) => l ? i : null).filter(i => i !== null),
      history,
      live: isLiveEnabled(),
    }));

    ws.on('pong', () => { (ws as any)._alive = true; });
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'pong') (ws as any)._alive = true;
        if (msg.type === 'message') {
          if (!isLiveEnabled()) return;
          const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
          processWsMessage(data.toString(), ip);
        }
      } catch {}
    });
    ws.on('close', () => {
      clients.delete(ws);
      releaseLane((ws as any)._lane);
    });
    ws.on('error', () => {
      clients.delete(ws);
      releaseLane((ws as any)._lane);
    });
  });

  // Keepalive
  const keepalive = setInterval(() => {
    wss.clients.forEach((ws) => {
      if ((ws as any)._alive === false) return ws.terminate();
      (ws as any)._alive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(keepalive));

  return wss;
}
