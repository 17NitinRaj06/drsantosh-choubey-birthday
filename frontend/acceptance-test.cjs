/**
 * Acceptance test harness — attempt 1 of max 3.
 *
 * - Builds the static export (next build → out/)
 * - Serves out/ with an in-process node:http static server on a random free port
 * - Runs Playwright against the production export
 * - Proper cleanup in finally + process.on handlers
 * - 90-second watchdog
 */

const { execSync, spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const net = require('net');

const FRONTEND_DIR = __dirname;
const OUT_DIR = path.join(FRONTEND_DIR, 'out');
const SCREENSHOT_DIR = path.resolve(FRONTEND_DIR, '..', 'screenshots', 'test');

let server = null;
let browser = null;
let context = null;
let spawned = [];
let exited = false;
let watchdog = null;

// ─── Cleanup ───

function cleanup(msg) {
  if (exited) return;
  exited = true;
  if (msg) console.log(`\n  Cleanup: ${msg}`);

  if (watchdog) { clearTimeout(watchdog); watchdog = null; }

  try { if (context) context.close().catch(() => {}); } catch {}
  try { if (browser) browser.close().catch(() => {}); } catch {}
  try { if (server) server.close(); } catch {}

  for (const p of spawned) {
    try {
      if (p.pid) {
        execSync(`taskkill /pid ${p.pid} /T /F 2>nul`, { stdio: 'ignore' });
      }
    } catch {}
  }
}

process.on('exit', () => cleanup('process.exit'));
process.on('SIGINT', () => { cleanup('SIGINT'); process.exit(1); });
process.on('uncaughtException', (err) => { console.error('Uncaught:', err.message); cleanup('uncaughtException'); process.exit(1); });

// ─── Static file server ───

function mimeFor(p) {
  const ext = path.extname(p).toLowerCase();
  const map = {
    '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff',
    '.txt': 'text/plain',
  };
  return map[ext] || 'application/octet-stream';
}

function startStaticServer(rootDir, port) {
  return new Promise((resolve, reject) => {
    const srv = http.createServer((req, res) => {
      let url = decodeURIComponent(req.url.split('?')[0]);
      if (url.endsWith('/')) url += 'index.html';

      const filePath = path.join(rootDir, url);
      const safePath = path.resolve(filePath);
      if (!safePath.startsWith(path.resolve(rootDir))) {
        res.writeHead(403); res.end(); return;
      }

      fs.readFile(safePath, (err, data) => {
        if (err) {
          // Try index.html for SPA-like fallback
          fs.readFile(path.join(rootDir, 'index.html'), (err2, data2) => {
            if (err2) { res.writeHead(404); res.end('Not found'); return; }
            res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(data2);
          });
          return;
        }
        res.writeHead(200, { 'Content-Type': mimeFor(safePath) }); res.end(data);
      });
    });

    srv.listen(port, '127.0.0.1', () => resolve(srv));
    srv.on('error', reject);
  });
}

function getRandomPort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

// ─── Main ───

async function main() {
  console.log('=== ACCEPTANCE TESTS (Attempt) ===\n');

  // Watchdog — 90 seconds
  watchdog = setTimeout(() => {
    console.error('\n  WATCHDOG: 90s timeout exceeded');
    cleanup('watchdog');
    process.exit(2);
  }, 90000);
  // Note: NOT unref'd — must keep process alive

  // 1. Build
  console.log('Step 1: Building static export...');
  try {
    const nextBin = path.join(FRONTEND_DIR, 'node_modules', '.bin', process.platform === 'win32' ? 'next.cmd' : 'next');
    execSync(`"${nextBin}" build`, { cwd: FRONTEND_DIR, stdio: 'pipe', timeout: 180000 });
    console.log('  ✓ Build complete\n');
  } catch (err) {
    console.error('  ✗ Build failed:', err.stderr?.toString() || err.message);
    cleanup('build failed');
    process.exit(1);
  }

  // 2. Start static server
  console.log('Step 2: Starting static file server...');
  const port = await getRandomPort();
  console.log(`  Using port ${port}`);

  if (!fs.existsSync(path.join(OUT_DIR, 'index.html'))) {
    console.error('  ✗ out/index.html not found');
    cleanup('no out/');
    process.exit(1);
  }

  server = await startStaticServer(OUT_DIR, port);
  console.log(`  ✓ Serving out/ on http://127.0.0.1:${port}\n`);

  const BASE = `http://127.0.0.1:${port}`;

  // 3. Start Playwright
  console.log('Step 3: Starting Playwright...');
  const { chromium } = require('playwright');
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  console.log('  ✓ Playwright ready\n');

  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  let failures = 0;

  // ─── TEST A: Single WS connection ───
  {
    console.log('TEST A: Single WebSocket connection (not per-component)');
    const page = await context.newPage();
    const wsUrls = [];
    page.on('websocket', ws => wsUrls.push(ws.url()));

    const consoleErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

    await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 15000 });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(r => setTimeout(r, 2000));

    const ok = wsUrls.length <= 1;
    console.log(`    Connections: ${wsUrls.length} ${ok ? '✓ PASS' : '✗ FAIL'}`);
    if (!ok) failures++;
    if (consoleErrors.length) console.log(`    Console errors: ${consoleErrors.join('; ')}`);
    await page.close();
  }

  // ─── TEST B: Offline/empty state, no flicker ───
  {
    console.log('\nTEST B: Without service — stable state, no flicker');
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

    await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 15000 });

    // Scroll to wishes
    await page.evaluate(() => {
      const el = document.getElementById('wishes');
      if (el) el.scrollIntoView({ behavior: 'instant' });
    });
    await new Promise(r => setTimeout(r, 1500));

    // Read data-state attribute
    const state = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="wishes-state"]');
      return el ? el.getAttribute('data-state') : null;
    });
    console.log(`    data-state="${state}"`);

    // Screenshot
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'test-b-state.png'), fullPage: false });

    if (!state) {
      console.log('    ✗ FAIL — wishes-state element not found');
      const html = await page.evaluate(() => {
        const el = document.getElementById('wishes');
        return el ? el.outerHTML.substring(0, 500) : 'NOT FOUND';
      });
      console.log(`    outerHTML: ${html}`);
      failures++;
    } else if (state === 'empty') {
      console.log('    ✓ PASS — state is "empty" (no service → immediate empty)');
    } else if (state === 'connecting') {
      // May still be connecting after 1.5s — check again
      await new Promise(r => setTimeout(r, 9000));
      const state2 = await page.evaluate(() => {
        const el = document.querySelector('[data-testid="wishes-state"]');
        return el ? el.getAttribute('data-state') : null;
      });
      console.log(`    After 9s more: data-state="${state2}"`);
      const ok = state2 === 'empty' || state2 === 'offline';
      console.log(`    ${ok ? '✓ PASS' : '✗ FAIL'} — transitioned to stable state`);
      if (!ok) failures++;
    } else {
      console.log(`    ✗ FAIL — unexpected state "${state}"`);
      failures++;
    }

    // DOM mutation stability
    const mutations = await page.evaluate(async () => {
      const section = document.querySelector('[data-testid="wishes-state"]');
      if (!section) return -1;
      let count = 0;
      const observer = new MutationObserver(() => count++);
      observer.observe(section, { childList: true, subtree: true, characterData: true });
      await new Promise(r => setTimeout(r, 5000));
      observer.disconnect();
      return count;
    });
    console.log(`    DOM mutations in 5s: ${mutations} ${mutations < 5 ? '✓ PASS' : '(flicker?)'}`);

    if (consoleErrors.length) console.log(`    Console errors: ${consoleErrors.join('; ')}`);
    await page.close();
  }

  // ─── TEST C: Chat overlay not clipped ───
  {
    console.log('\nTEST C: Chat overlay not clipped at screen edge');
    const page = await context.newPage();
    await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 15000 });

    const widths = [390, 768, 1440, 1920];
    let allOk = true;
    for (const w of widths) {
      await page.setViewportSize({ width: w, height: 800 });
      await new Promise(r => setTimeout(r, 300));
      const result = await page.evaluate(() => {
        const panel = document.querySelector('.hidden.md\\:flex.fixed');
        if (!panel) return { found: false };
        const rect = panel.getBoundingClientRect();
        return { found: true, left: rect.left, visible: rect.left >= 0 && rect.left < window.innerWidth };
      });
      if (!result.found) continue;
      const clipped = result.left < 0;
      console.log(`    ${w}px: left=${result.left.toFixed(0)}px ${clipped ? '✗ CLIPPED' : '✓ OK'}`);
      if (clipped) allOk = false;
    }

    const hasSafeArea = await page.evaluate(() => {
      const panel = document.querySelector('.hidden.md\\:flex.fixed');
      if (!panel) return false;
      return (panel.getAttribute('style') || '').includes('safe-area-inset');
    });
    console.log(`    safe-area-inset: ${hasSafeArea ? '✓ PASS' : '✗ FAIL'}`);
    if (!hasSafeArea) allOk = false;

    if (!allOk) failures++;
    await page.close();
  }

  // ─── TEST D: Footer has correct text ───
  {
    console.log('\nTEST D: Footer has correct tribute text');
    const page = await context.newPage();
    await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 15000 });

    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(r => setTimeout(r, 1500));

    // Assert footer exists
    const footerExists = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="footer"]');
      return el ? el.textContent.length : 0;
    });
    console.log(`    Footer exists with text: ${footerExists > 0 ? '✓ (' + footerExists + ' chars)' : '✗ FAIL (not found or empty)'}`);
    if (footerExists === 0) {
      failures++;
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'test-d-footer-missing.png'), fullPage: false });
    } else {
      const footerText = await page.evaluate(() => {
        const el = document.querySelector('[data-testid="footer"]');
        return el ? el.textContent : '';
      });

      const checks = {
        'Has "A tribute to Santosh Choubey"': footerText.includes('A tribute to Santosh Choubey'),
        'Has "A tribute website. Photographs: santoshchoubey.com."': footerText.includes('A tribute website. Photographs: santoshchoubey.com.'),
        'Has "© 2026 Department of CS & IT, AISECT University."': footerText.includes('© 2026 Department of CS & IT, AISECT University.'),
        'Has "1955 to 2026"': footerText.includes('1955 to 2026'),
        'No "Plot No"': !footerText.includes('Plot No'),
        'No "Hoshangabad"': !footerText.includes('Hoshangabad'),
        'No "462047"': !footerText.includes('462047'),
        'No "choubey@aisect.org"': !footerText.includes('choubey@aisect.org'),
        'No "info@aisect.org"': !footerText.includes('info@aisect.org'),
        'No "rntu.ac.in"': !footerText.includes('rntu.ac.in'),
        'No "tagoreuniversity"': !footerText.includes('tagoreuniversity'),
      };

      for (const [name, ok] of Object.entries(checks)) {
        console.log(`    ${name}: ${ok ? '✓' : '✗ FAIL'}`);
        if (!ok) failures++;
      }

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'test-d-footer.png'), fullPage: false });
    }
    await page.close();
  }

  // ─── TEST E: Loading skeleton fixed height ───
  {
    console.log('\nTEST E: Loading skeleton has fixed height (no layout shift)');
    const page = await context.newPage();
    await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 15000 });

    const state = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="wishes-state"]');
      return el ? el.getAttribute('data-state') : null;
    });

    if (state === 'connecting' || state === 'idle') {
      // Check for skeleton
      const skeleton = await page.evaluate(() => {
        const skeletons = document.querySelectorAll('#wishes .animate-pulse');
        if (skeletons.length === 0) return { found: false };
        return { found: true, height: skeletons[0].getBoundingClientRect().height, count: skeletons.length };
      });
      if (skeleton.found) {
        const fixed = skeleton.height === 120;
        console.log(`    Height: ${skeleton.height}px ${fixed ? '✓ PASS' : '✗ FAIL (expected 120px)'}`);
        if (!fixed) failures++;
      } else {
        console.log('    No skeleton visible (state already resolved) ✓');
      }
    } else {
      console.log(`    State is "${state}" — skeleton already resolved ✓`);
    }

    await page.close();
  }

  // ─── Final report ───
  console.log(`\n=== RESULT: ${failures === 0 ? 'ALL PASSED ✓' : failures + ' FAILED ✗'} ===`);
  console.log(`Attempt: 1/3`);

  cleanup('done');
  process.exit(failures ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal:', err);
  cleanup('exception');
  process.exit(1);
});
