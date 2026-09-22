import { MongoClient, ObjectId, type Collection, type Document } from 'mongodb';

// ─── Types ───

export interface WishDocument {
  _id: ObjectId;
  seq: number;
  clientId: string;
  name: string;
  department: string | null;
  message: string;
  status: 'visible' | 'hidden';
  createdAt: Date;
  ipHash: string;
}

// ─── Redact helper ───

function redact(uri: string): string {
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
}

// ─── Connection ───

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'wishes';

if (!MONGODB_URI) {
  console.error('FATAL: MONGODB_URI is not set');
  process.exit(1);
}

console.log(`Connecting to MongoDB: ${redact(MONGODB_URI)}`);

let client!: MongoClient;
let db!: ReturnType<MongoClient['db']>;
let collection!: Collection<WishDocument>;
interface SettingDocument {
  _id: string;
  enabled: boolean;
  updatedAt?: Date;
  updatedBy?: string;
}

let settingsCollection!: Collection<SettingDocument>;
let dbConnected = false;

// ─── Live state cache ───

let liveEnabled = true;

export function isLiveEnabled(): boolean {
  return liveEnabled;
}

export async function setLiveState(enabled: boolean, updatedBy?: string): Promise<void> {
  liveEnabled = enabled;
  if (dbConnected) {
    await settingsCollection.updateOne(
      { _id: 'live' },
      { $set: { enabled, updatedAt: new Date(), updatedBy } },
      { upsert: true }
    );
  }
}

async function loadLiveState(): Promise<void> {
  if (!dbConnected) return;
  const doc = await settingsCollection.findOne({ _id: 'live' });
  if (doc) {
    liveEnabled = !!doc.enabled;
  }
}

const memoryBuffer: WishDocument[] = [];
const MEMORY_LIMIT = 500;
let lastSeq = 0;

try {
  client = new MongoClient(MONGODB_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
  });

  await client.connect();
  db = client.db(MONGODB_DB);
  collection = db.collection('messages');
  settingsCollection = db.collection('settings');
  dbConnected = true;
  console.log(`MongoDB connected to database "${MONGODB_DB}"`);

  await collection.createIndexes([
    { key: { seq: -1 }, unique: true },
    { key: { clientId: 1 }, unique: true },
    { key: { status: 1, seq: -1 } },
    { key: { createdAt: -1 } },
  ]);

  await loadLiveState();
  console.log(`Live state: ${liveEnabled ? 'ON' : 'OFF'}`);

  // Init seq from highest
  const highest = await collection.findOne({}, { sort: { seq: -1 }, projection: { seq: 1 } as any });
  lastSeq = (highest as any)?.seq ?? 0;
  console.log(`Seq counter initialized to ${lastSeq}`);

  // Load buffer
  const docs = await collection
    .find({ status: 'visible' })
    .sort({ seq: -1 })
    .limit(MEMORY_LIMIT)
    .toArray();
  memoryBuffer.push(...docs.reverse());
  console.log(`Loaded ${memoryBuffer.length} visible messages into memory buffer`);
} catch (err: any) {
  console.error(`MongoDB connection failed: ${err.message}. Continuing without database.`);
  dbConnected = false;
}

// ─── Public API ───

export function nextSeq(): number {
  return ++lastSeq;
}

export function getBuffer(): readonly WishDocument[] {
  return memoryBuffer;
}

export function addToBuffer(doc: WishDocument): void {
  memoryBuffer.push(doc);
  if (memoryBuffer.length > MEMORY_LIMIT) {
    memoryBuffer.shift();
  }
}

export function hasClientId(clientId: string): boolean {
  return memoryBuffer.some(d => d.clientId === clientId);
}

export function removeFromBuffer(seq: number): void {
  const idx = memoryBuffer.findIndex(d => d.seq === seq);
  if (idx >= 0) memoryBuffer.splice(idx, 1);
}

export function updateBufferStatus(seq: number, status: 'visible' | 'hidden'): void {
  const doc = memoryBuffer.find(d => d.seq === seq);
  if (doc) doc.status = status;
}

export function getHistory(before?: number, limit = 50): WishDocument[] {
  const capped = Math.min(limit, 100);
  let filtered = memoryBuffer.filter(d => d.status === 'visible');
  if (before !== undefined) {
    filtered = filtered.filter(d => d.seq < before);
  }
  return filtered.slice(-capped).reverse();
}

export async function getHistoryFromDb(before?: number, limit = 50): Promise<WishDocument[]> {
  const capped = Math.min(limit, 100);
  if (!dbConnected) return getHistory(before, capped);
  const query: any = { status: 'visible' };
  if (before !== undefined) {
    query.seq = { $lt: before };
  }
  return collection.find(query).sort({ seq: -1 }).limit(capped).toArray();
}

export function getVisibleCount(): number {
  return memoryBuffer.filter(d => d.status === 'visible').length;
}

export async function getDbCount(): Promise<number> {
  if (!dbConnected) return memoryBuffer.filter(d => d.status === 'visible').length;
  return collection.countDocuments({ status: 'visible' });
}

export function getAllMessages(): WishDocument[] {
  return [...memoryBuffer];
}

export async function getAllMessagesFromDb(): Promise<WishDocument[]> {
  if (!dbConnected) return [...memoryBuffer];
  return collection.find().sort({ seq: -1 }).toArray();
}

// ─── Writes ───

const pendingWrites: WishDocument[] = [];
const QUEUE_CAP = 20000;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let dbDown = false;
let retryDelay = 1000;

export function enqueueWrite(doc: WishDocument): void {
  if (pendingWrites.length < QUEUE_CAP) {
    pendingWrites.push(doc);
  }
}

export function getQueueLength(): number {
  return pendingWrites.length;
}

export function isDbDown(): boolean {
  return dbDown;
}

export async function flushWrites(): Promise<void> {
  if (!pendingWrites.length || !dbConnected) return;
  const batch = pendingWrites.splice(0, pendingWrites.length);
  try {
    await collection.insertMany(batch, { ordered: false });
    dbDown = false;
    retryDelay = 1000;
  } catch (err: any) {
    // Duplicate key on clientId = success (idempotent)
    if (err?.code === 11000) {
      dbDown = false;
      retryDelay = 1000;
      return;
    }
    console.error(`Batch flush failed (${err?.message}), re-queuing ${batch.length} docs`);
    pendingWrites.unshift(...batch);
    dbDown = true;
    retryDelay = Math.min(retryDelay * 2, 30000);
  }
}

export function startFlushLoop(): void {
  function schedule() {
    flushTimer = setTimeout(async () => {
      await flushWrites();
      schedule();
    }, 1000 + Math.random() * 1000);
  }
  schedule();
}

export async function flushOnShutdown(): Promise<void> {
  if (flushTimer) clearTimeout(flushTimer);
  while (pendingWrites.length > 0) {
    await flushWrites();
  }
}

// ─── Admin operations ───

export async function hideMessage(seq: number): Promise<WishDocument | null> {
  if (!dbConnected) return null;
  const doc = await collection.findOneAndUpdate(
    { seq },
    { $set: { status: 'hidden' } },
    { returnDocument: 'after' }
  );
  if (doc) updateBufferStatus(seq, 'hidden');
  return doc as WishDocument | null;
}

export async function deleteMessageBySeq(seq: number): Promise<boolean> {
  if (!dbConnected) return false;
  const result = await collection.deleteOne({ seq });
  if (result.deletedCount > 0) {
    removeFromBuffer(seq);
    return true;
  }
  return false;
}

export async function exportAll(): Promise<WishDocument[]> {
  if (!dbConnected) return [];
  return collection.find().sort({ seq: -1 }).toArray();
}

export async function healthcheck(): Promise<{ ok: boolean; db: 'up' | 'down'; queued: number }> {
  try {
    await db.command({ ping: 1 });
    return { ok: true, db: 'up', queued: pendingWrites.length };
  } catch {
    return { ok: false, db: 'down', queued: pendingWrites.length };
  }
}

// ─── Graceful shutdown ───

export async function close(): Promise<void> {
  await flushOnShutdown();
  if (dbConnected) await client.close();
}
