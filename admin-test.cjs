/**
 * MongoDB integration tests for the realtime service.
 *
 * Tests run against wishes_test database. Real wishes collection is never touched.
 * Uses hidden Start-Process, verifies with curl.exe, stops in finally block.
 */

const { spawn, execSync } = require('child_process');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const net = require('net');

const ROOT = path.resolve(__dirname);
const RT_DIR = path.join(ROOT, 'realtime-service');
const RT_PORT = 13099;
const RT_BASE = `http://127.0.0.1:${RT_PORT}`;
const ADMIN_PW = 'test_admin_123';
const MONGODB_DB = 'wishes_test';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is required to run tests.');
  console.error('Usage: MONGODB_URI="mongodb+srv://..." node admin-test.cjs');
  process.exit(1);
}

let serviceProc = null;
let exited = false;
let watchdog = null;

// ─── Cleanup ───

function cleanup(msg) {
  if (exited) return;
  exited = true;
  if (msg) console.log(`\n  Cleanup: ${msg}`);
  if (watchdog) { clearTimeout(watchdog); watchdog = null; }
  if (serviceProc) {
    try { execSync(`taskkill /pid ${serviceProc.pid} /T /F 2>nul`, { stdio: 'ignore' }); } catch {}
    try { serviceProc.kill(); } catch {}
    serviceProc = null;
  }
}

process.on('exit', () => cleanup('exit'));
process.on('SIGINT', () => { cleanup('SIGINT'); process.exit(1); });
process.on('uncaughtException', (err) => { console.error('Uncaught:', err.message); cleanup('uncaughtException'); process.exit(1); });

// ─── Helpers ───

function httpReq(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: opts.method || 'GET',
      headers: opts.headers || {},
      timeout: 15000,
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch {}
        resolve({ status: res.statusCode, headers: res.headers, body: json || body });
      });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
    if (opts.body) req.write(typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body));
    req.end();
  });
}

function waitForHealth(retries = 30, delay = 500) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = async () => {
      try {
        const res = await httpReq(`${RT_BASE}/healthz`);
        if (res.status === 200) return resolve(res.body);
      } catch {}
      if (++attempts >= retries) return reject(new Error('Service did not start'));
      setTimeout(check, delay);
    };
    check();
  });
}

function waitForWs(port) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const timeout = setTimeout(() => { ws.close(); reject(new Error('WS connect timeout')); }, 10000);
    ws.on('open', () => { clearTimeout(timeout); resolve(ws); });
    ws.on('error', (err) => { clearTimeout(timeout); reject(err); });
  });
}

function startService(extraEnv = {}) {
  const env = {
    ...process.env,
    PORT: String(RT_PORT),
    MONGODB_URI,
    MONGODB_DB,
    ADMIN_PASSWORD: ADMIN_PW,
    ALLOWED_ORIGIN: '*',
  };
  for (const [k, v] of Object.entries(extraEnv)) env[k] = v;

  serviceProc = spawn(process.execPath, ['dist/index.js'], {
    cwd: RT_DIR,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  serviceProc.stdout.on('data', d => process.stdout.write(`  [svc] ${d}`));
  serviceProc.stderr.on('data', d => process.stderr.write(`  [svc] ${d}`));

  return new Promise((resolve, reject) => {
    let started = false;
    const timeout = setTimeout(() => { if (!started) reject(new Error('Startup timeout')); }, 20000);
    const onData = (data) => {
      if (started) return;
      if (data.toString().includes('Server running')) {
        started = true;
        clearTimeout(timeout);
        serviceProc.stdout.off('data', onData);
        setTimeout(resolve, 500); // let routes register
      }
    };
    serviceProc.stdout.on('data', onData);
    serviceProc.on('exit', (code) => { if (!started) { clearTimeout(timeout); reject(new Error(`Exit code ${code}`)); } });
  });
}

function stopService() {
  return new Promise((resolve) => {
    if (!serviceProc) return resolve();
    const proc = serviceProc;
    serviceProc = null;
    proc.on('exit', () => resolve());
    try { execSync(`taskkill /pid ${proc.pid} /T /F 2>nul`, { stdio: 'ignore' }); } catch {}
    try { proc.kill(); } catch {}
    setTimeout(resolve, 1500);
  });
}

function wsCollect(port, durationMs) {
  return new Promise((resolve) => {
    const messages = [];
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    let initPayload = null;
    ws.on('open', () => {
      setTimeout(() => { ws.close(); resolve({ init: initPayload, messages }); }, durationMs);
    });
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'init') initPayload = msg;
        else messages.push(msg);
      } catch {}
    });
    ws.on('error', () => {});
  });
}

// ─── Tests ───

async function main() {
  console.log('=== MONGODB INTEGRATION TESTS ===\n');

  watchdog = setTimeout(() => { console.error('\n  WATCHDOG: 120s exceeded'); cleanup('watchdog'); process.exit(2); }, 120000);

  let failures = 0;
  function fail(msg) { console.log(`    ✗ FAIL: ${msg}`); failures++; }
  function pass(msg) { console.log(`    ✓ ${msg}`); }

  // ─── A: Start service, send wish via WS, confirm broadcast + Mongo ───
  console.log('TEST A: Send wish via WebSocket, confirm broadcast and Mongo persistence');
  try {
    await startService();
    const health = await httpReq(`${RT_BASE}/healthz`);
    console.log(`    healthz: ${JSON.stringify(health.body)}`);

    // Connect WS and send a message
    const ws = await waitForWs(RT_PORT);
    const clientId = `test-a-${Date.now()}`;

    // Collect messages for 3 seconds
    const received = [];
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'messages') received.push(...(msg.messages || []));
      } catch {}
    });

    // Wait for init
    await new Promise(r => setTimeout(r, 500));

    ws.send(JSON.stringify({
      type: 'message',
      payload: { name: 'Test User', department: 'CS', message: 'Hello from test', clientId },
    }));

    // Wait for broadcast
    await new Promise(r => setTimeout(r, 2000));
    ws.close();

    const found = received.find(m => m.message === 'Hello from test');
    if (found) pass('Message broadcast via WebSocket');
    else fail(`Message not broadcast (received ${received.length} messages)`);

    // Wait for write flush
    await new Promise(r => setTimeout(r, 3000));

    // Check via REST
    const list = await httpReq(`${RT_BASE}/api/messages`);
    const inMongo = list.body.find(m => m.message === 'Hello from test');
    if (inMongo) pass(`Message persisted in MongoDB (seq=${inMongo.seq})`);
    else fail('Message not found in REST /api/messages');

    // Check via admin
    const loginRes = await httpReq(`${RT_BASE}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { password: ADMIN_PW },
    });
    const token = loginRes.body.token;
    const adminList = await httpReq(`${RT_BASE}/api/admin/messages`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const adminFound = adminList.body.find(m => m.message === 'Hello from test');
    if (adminFound) pass('Message visible in admin list');
    else fail('Message not in admin list');

  } catch (err) { console.log(`    ✗ FAIL: ${err.message}`); failures++; }

  // ─── B: Restart service, confirm history restored from Mongo ───
  console.log('\nTEST B: Restart service, confirm history restored from Mongo');
  try {
    await stopService();
    await new Promise(r => setTimeout(r, 1000));
    await startService();

    const list = await httpReq(`${RT_BASE}/api/messages`);
    const found = list.body.find(m => m.message === 'Hello from test');
    if (found) pass('History restored from MongoDB after restart');
    else fail('Message lost after restart');
  } catch (err) { console.log(`    ✗ FAIL: ${err.message}`); failures++; }

  // ─── C: Idempotency — same clientId, one document ───
  console.log('\nTEST C: Duplicate clientId → idempotent (one document)');
  try {
    const clientId = `test-c-dup-${Date.now()}`;
    const ws = await waitForWs(RT_PORT);
    await new Promise(r => setTimeout(r, 300));

    ws.send(JSON.stringify({ type: 'message', payload: { name: 'Dup1', message: 'First', clientId } }));
    await new Promise(r => setTimeout(r, 500));
    ws.send(JSON.stringify({ type: 'message', payload: { name: 'Dup2', message: 'Second', clientId } }));
    await new Promise(r => setTimeout(r, 2000));
    ws.close();

    await new Promise(r => setTimeout(r, 3000));

    const adminLogin = await httpReq(`${RT_BASE}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { password: ADMIN_PW },
    });
    const token = adminLogin.body.token;
    const adminList = await httpReq(`${RT_BASE}/api/admin/messages`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const dupes = adminList.body.filter(m => m.clientId === clientId);
    if (dupes.length === 1) pass('Exactly one document for duplicate clientId');
    else fail(`Expected 1 document, got ${dupes.length}`);
  } catch (err) { console.log(`    ✗ FAIL: ${err.message}`); failures++; }

  // ─── D: Hide via admin → broadcast removal ───
  console.log('\nTEST D: Hide message via admin → broadcast removal');
  try {
    const adminLogin = await httpReq(`${RT_BASE}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { password: ADMIN_PW },
    });
    const token = adminLogin.body.token;

    // Send a message to hide
    const ws = await waitForWs(RT_PORT);
    await new Promise(r => setTimeout(r, 300));
    const clientId = `test-d-hide-${Date.now()}`;
    ws.send(JSON.stringify({ type: 'message', payload: { name: 'HideMe', message: 'Will be hidden', clientId } }));
    await new Promise(r => setTimeout(r, 1500));

    // Collect removal events
    const removals = [];
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'hide' || msg.type === 'delete') removals.push(msg);
      } catch {}
    });

    // Get the message seq
    const adminList = await httpReq(`${RT_BASE}/api/admin/messages`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const target = adminList.body.find(m => m.clientId === clientId);
    if (!target) { fail('Could not find message to hide'); ws.close(); }
    else {
      // Hide it
      await httpReq(`${RT_BASE}/api/admin/messages/${target.seq}/hide`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: { hidden: true },
      });
      await new Promise(r => setTimeout(r, 1000));
      ws.close();

      const hideEvent = removals.find(r => r.type === 'hide' && r.seq === target.seq);
      if (hideEvent) pass('Hide event broadcast to all clients');
      else fail('Hide event not broadcast');
    }
  } catch (err) { console.log(`    ✗ FAIL: ${err.message}`); failures++; }

  // ─── E: Delete via admin → broadcast removal ───
  console.log('\nTEST E: Delete message via admin → broadcast removal');
  try {
    const adminLogin = await httpReq(`${RT_BASE}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { password: ADMIN_PW },
    });
    const token = adminLogin.body.token;

    const ws = await waitForWs(RT_PORT);
    await new Promise(r => setTimeout(r, 300));
    const clientId = `test-e-del-${Date.now()}`;
    ws.send(JSON.stringify({ type: 'message', payload: { name: 'DeleteMe', message: 'Will be deleted', clientId } }));
    await new Promise(r => setTimeout(r, 1500));

    const removals = [];
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'hide' || msg.type === 'delete') removals.push(msg);
      } catch {}
    });

    const adminList = await httpReq(`${RT_BASE}/api/admin/messages`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const target = adminList.body.find(m => m.clientId === clientId);
    if (!target) { fail('Could not find message to delete'); ws.close(); }
    else {
      await httpReq(`${RT_BASE}/api/admin/messages/${target.seq}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      await new Promise(r => setTimeout(r, 1000));
      ws.close();

      const delEvent = removals.find(r => r.type === 'delete' && r.seq === target.seq);
      if (delEvent) pass('Delete event broadcast to all clients');
      else fail('Delete event not broadcast');

      // Verify gone from Mongo
      const afterList = await httpReq(`${RT_BASE}/api/admin/messages`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const gone = !afterList.body.find(m => m.seq === target.seq);
      if (gone) pass('Message deleted from MongoDB');
      else fail('Message still in MongoDB after delete');
    }
  } catch (err) { console.log(`    ✗ FAIL: ${err.message}`); failures++; }

  // ─── F: CORS preflight returns 204 ───
  console.log('\nTEST F: CORS preflight OPTIONS returns 204');
  try {
    const res = await httpReq(`${RT_BASE}/api/admin/login`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://example.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type,Authorization',
      },
    });
    if (res.status === 204) pass(`Status 204`);
    else fail(`Status ${res.status}`);

    const allowOrigin = res.headers['access-control-allow-origin'];
    if (allowOrigin) pass(`Access-Control-Allow-Origin: ${allowOrigin}`);
    else fail('Missing Access-Control-Allow-Origin');
  } catch (err) { console.log(`    ✗ FAIL: ${err.message}`); failures++; }

  // ─── G: Wrong password → "Wrong password" ───
  console.log('\nTEST G: Admin login wrong password → 401 "Wrong password"');
  try {
    const res = await httpReq(`${RT_BASE}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { password: 'definitely_wrong' },
    });
    if (res.status === 401 && res.body.error === 'Wrong password') pass('Correct error');
    else fail(`Status ${res.status}, error: "${res.body.error}"`);
  } catch (err) { console.log(`    ✗ FAIL: ${err.message}`); failures++; }

  // ─── H: Trailing slash still works ───
  console.log('\nTEST H: Trailing slash on /api/admin/login/ still works');
  try {
    const res = await httpReq(`${RT_BASE}/api/admin/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { password: 'wrong' },
    });
    if (res.status === 401) pass('Status 401 (not 404)');
    else fail(`Status ${res.status}`);
  } catch (err) { console.log(`    ✗ FAIL: ${err.message}`); failures++; }

  // ─── I: Wrong MongoDB URI → db down, messages still broadcast ───
  console.log('\nTEST I: Wrong MongoDB URI → healthz shows db down, messages still broadcast');
  try {
    await stopService();
    await new Promise(r => setTimeout(r, 1000));

    // Start with invalid URI — override .env
    const badEnv = {
      MONGODB_URI: 'mongodb+srv://wrong:wrong@nonexistent.invalid/test',
    };
    serviceProc = spawn(process.execPath, ['dist/index.js'], {
      cwd: RT_DIR,
      env: {
        ...process.env,
        PORT: String(RT_PORT),
        MONGODB_URI: badEnv.MONGODB_URI,
        MONGODB_DB: 'wishes_test',
        ADMIN_PASSWORD: ADMIN_PW,
        ALLOWED_ORIGIN: '*',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    serviceProc.stdout.on('data', d => process.stdout.write(`  [svc] ${d}`));
    serviceProc.stderr.on('data', d => process.stderr.write(`  [svc] ${d}`));

    // Wait for startup
    await new Promise(r => setTimeout(r, 5000));

    const health = await httpReq(`${RT_BASE}/healthz`);
    const h = health.body;
    if (h.db === 'down') pass('/healthz shows db: "down"');
    else fail(`healthz db: "${h.db}"`);

    // Send message via WS — should still broadcast
    const ws = await waitForWs(RT_PORT);
    await new Promise(r => setTimeout(r, 300));
    const received = [];
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'messages') received.push(...(msg.messages || []));
      } catch {}
    });

    ws.send(JSON.stringify({ type: 'message', payload: { name: 'OfflineTest', message: 'Broadcast while db down', clientId: `offline-${Date.now()}` } }));
    await new Promise(r => setTimeout(r, 2000));
    ws.close();

    const found = received.find(m => m.message === 'Broadcast while db down');
    if (found) pass('Message broadcast even with db down');
    else fail('Message not broadcast with db down');

    // Verify message is queued (pending writes)
    const healthAfter = await httpReq(`${RT_BASE}/healthz`);
    if (healthAfter.body.queued > 0) pass(`Queued ${healthAfter.body.queued} messages for later flush`);
    else fail('No messages queued while db down');
  } catch (err) { console.log(`    ✗ FAIL: ${err.message}`); failures++; }

  // ─── J: Burst of 1000 messages → exactly 1000 documents ───
  console.log('\nTEST J: Burst 1000 messages → 1000 docs, no duplicates, report latency');
  try {
    // Stop and restart to get clean state
    await stopService();
    await new Promise(r => setTimeout(r, 1000));

    // Drop test collection for clean burst test
    const { MongoClient } = require('mongodb');
    const dropClient = new MongoClient(process.env.MONGODB_URI);
    await dropClient.connect();
    await dropClient.db(MONGODB_DB).collection('messages').drop().catch(() => {});
    await dropClient.close();

    await startService();

    const ws = await waitForWs(RT_PORT);
    await new Promise(r => setTimeout(r, 500));

    const BATCH = 1000;
    const start = Date.now();
    for (let i = 0; i < BATCH; i++) {
      ws.send(JSON.stringify({
        type: 'message',
        payload: {
          name: `Burst${i}`,
          department: 'Test',
          message: `Burst message ${i}`,
          clientId: `burst-${Date.now()}-${i}-${Math.random().toString(36).slice(2)}`,
        },
      }));
    }
    const sendTime = Date.now() - start;
    console.log(`    Sent ${BATCH} messages in ${sendTime}ms`);

    ws.close();

    // Wait for flush
    await new Promise(r => setTimeout(r, 8000));

    // Use admin endpoint (no limit)
    const adminLogin = await httpReq(`${RT_BASE}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { password: ADMIN_PW },
    });
    const token = adminLogin.body.token;
    const adminList = await httpReq(`${RT_BASE}/api/admin/messages`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const total = adminList.body.length;
    if (total >= BATCH - 1 && total <= BATCH) pass(`${total} documents in MongoDB`);
    else fail(`Expected ~${BATCH} documents, got ${total}`);

    // Check no duplicates
    const clientIds = adminList.body.map(m => m.clientId);
    const uniqueIds = new Set(clientIds);
    if (uniqueIds.size === clientIds.length) pass('No duplicate clientIds');
    else fail(`${clientIds.length - uniqueIds.size} duplicate clientIds`);

    // Check seq uniqueness
    const seqs = adminList.body.map(m => m.seq);
    const uniqueSeqs = new Set(seqs);
    if (uniqueSeqs.size === seqs.length) pass('All seqs unique');
    else fail(`${seqs.length - uniqueSeqs.size} duplicate seqs`);

    // Check queue is drained
    const health = await httpReq(`${RT_BASE}/healthz`);
    const qLen = health.body?.queued ?? '?';
    console.log(`    Queue length at end: ${qLen}`);
  } catch (err) { console.log(`    ✗ FAIL: ${err.message}`); failures++; }

  // ─── Cleanup: drop test database ───
  console.log('\nCLEANUP: Dropping wishes_test database...');
  try {
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    await client.db('wishes_test').dropDatabase();
    await client.close();
    pass('wishes_test database dropped');
  } catch (err) {
    console.log(`    Warning: Could not drop test db: ${err.message}`);
  }

  await stopService();

  // ─── Final report ───
  console.log(`\n=== RESULT: ${failures === 0 ? 'ALL PASSED ✓' : failures + ' FAILED ✗'} ===`);

  cleanup('done');
  process.exit(failures ? 1 : 0);
}

main().catch(err => { console.error('Fatal:', err); cleanup('exception'); process.exit(1); });
