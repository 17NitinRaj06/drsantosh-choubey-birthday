/**
 * Image Recovery Script
 *
 * 1. Crawls santoshchoubey.com to build manifest.json of all images
 * 2. Compares against images needed by content.json + content.ts + Cover.tsx
 * 3. Downloads missing/broken images
 * 4. Verifies with sharp
 * 5. Reports status
 *
 * Usage: node scripts/recover-images.cjs [--dry-run] [--download] [--verify-only]
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const ROOT_DIR = path.resolve(__dirname, '..');
const IMAGES_DIR = path.join(ROOT_DIR, 'public');
const MANIFEST_PATH = path.join(ROOT_DIR, '..', 'manifest.json');
const CONTENT_JSON_PATH = path.join(ROOT_DIR, '..', 'content.json');

const SITE = 'https://santoshchoubey.com';

const PAGES_TO_CRAWL = [
  '/', '/profile', '/journey', '/social-entrepreneur', '/educationist',
  '/science-communicator', '/educational-institutions', '/literary-profile',
  '/poet', '/writer', '/theatre', '/cultural-institutions',
  '/vishwarang-foundation', '/books', '/professional-awards',
  '/literature-award', '/photogallery', '/news', '/video',
  '/words-of-appreciation'
];

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function fetchUrl(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === 'https:' ? https : http;
    const req = mod.get(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Referer': SITE + '/',
        ...opts.headers
      },
      timeout: 15000,
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const loc = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        return fetchUrl(loc, opts).then(resolve, reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          contentType: res.headers['content-type'] || '',
          body: Buffer.concat(chunks),
          url: res.url || url,
        });
      });
      res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

// ─── Phase 1: Get needed images from codebase ───

function getNeededImages() {
  const needed = new Map(); // path -> { source, context }

  function add(imgPath, source, context) {
    if (!needed.has(imgPath)) {
      needed.set(imgPath, { source, context });
    }
  }

  // From content.json
  const contentJson = JSON.parse(fs.readFileSync(CONTENT_JSON_PATH, 'utf8'));
  function findImages(obj, ctx) {
    if (!obj) return;
    if (typeof obj === 'string' && obj.startsWith('/images/')) { add(obj, 'content.json', ctx); return; }
    if (Array.isArray(obj)) { obj.forEach((v, i) => findImages(v, ctx + '[' + i + ']')); return; }
    if (typeof obj === 'object') {
      for (const [k, v] of Object.entries(obj)) {
        findImages(v, ctx + '.' + k);
      }
    }
  }
  findImages(contentJson, 'root');

  // From content.ts
  const contentTs = fs.readFileSync(path.join(ROOT_DIR, 'src', 'lib', 'content.ts'), 'utf8');
  const imgRe = /["'](\/images\/[^"']+)["']/g;
  let m;
  while ((m = imgRe.exec(contentTs)) !== null) {
    add(m[1], 'content.ts', `line ${contentTs.substring(0, m.index).split('\n').length}`);
  }

  // From Cover.tsx
  const coverPath = path.join(ROOT_DIR, 'src', 'components', 'Cover.tsx');
  if (fs.existsSync(coverPath)) {
    const cover = fs.readFileSync(coverPath, 'utf8');
    let cm;
    const coverRe = /["'](\/images\/[^"']+)["']/g;
    while ((cm = coverRe.exec(cover)) !== null) {
      add(cm[1], 'Cover.tsx', `line ${cover.substring(0, cm.index).split('\n').length}`);
    }
  }

  return needed;
}

// ─── Phase 2: Check local existence ───

function getLocalStatus(neededImages) {
  const results = [];
  for (const [imgPath, meta] of neededImages) {
    const localPath = path.join(IMAGES_DIR, imgPath.replace(/^\//, ''));
    const exists = fs.existsSync(localPath);
    const size = exists ? fs.statSync(localPath).size : 0;
    const status = !exists ? 'missing' : size < 1000 ? 'too-small' : 'ok';
    results.push({ path: imgPath, exists, size, localPath, status, ...meta });
  }
  return results;
}

// ─── Phase 3: Build manifest from site ───

async function crawlSite() {
  const manifest = {};

  for (const pagePath of PAGES_TO_CRAWL) {
    const pageUrl = SITE + pagePath;
    process.stdout.write(`  Crawling ${pagePath}...`);
    try {
      const { body, status } = await fetchUrl(pageUrl);
      if (status !== 200) {
        console.log(` HTTP ${status}`);
        continue;
      }
      const html = body.toString('utf8');

      const patterns = [
        /src=["']([^"']+?\.(?:webp|jpg|jpeg|png|gif|svg))["']/gi,
        /srcset=["']([^"']+?)["']/gi,
        /data-src=["']([^"']+?\.(?:webp|jpg|jpeg|png|gif|svg))["']/gi,
        /background-image:\s*url\(["']?([^"')]+?\.(?:webp|jpg|jpeg|png|gif|svg))["']?\)/gi,
      ];

      const foundUrls = new Set();
      for (const re of patterns) {
        let m;
        while ((m = re.exec(html)) !== null) {
          const val = m[1];
          if (val.includes(',')) {
            val.split(',').forEach(entry => {
              const u = entry.trim().split(/\s+/)[0];
              if (u) foundUrls.add(u);
            });
          } else {
            foundUrls.add(val);
          }
        }
      }

      let count = 0;
      for (const rawUrl of foundUrls) {
        try {
          let fullUrl;
          if (rawUrl.startsWith('http')) {
            fullUrl = rawUrl;
          } else if (rawUrl.startsWith('//')) {
            fullUrl = 'https:' + rawUrl;
          } else {
            fullUrl = new URL(rawUrl, SITE + '/').href;
          }

          if (!fullUrl.includes('santoshchoubey.com')) continue;

          const u = new URL(fullUrl);
          const imgPath = u.pathname;

          // Extract alt text
          const altMatch = html.match(new RegExp(`alt=["']([^"']*?)["'][^>]*src=["'][^"']*${path.basename(imgPath).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'i'))
            || html.match(new RegExp(`src=["'][^"']*${path.basename(imgPath).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*alt=["']([^"']*?)["']`, 'i'));

          if (!manifest[imgPath]) {
            manifest[imgPath] = {
              url: fullUrl,
              pages: [],
              alt: altMatch ? altMatch[1] : '',
            };
          }
          if (!manifest[imgPath].pages.includes(pagePath)) {
            manifest[imgPath].pages.push(pagePath);
          }
          if (altMatch && !manifest[imgPath].alt) {
            manifest[imgPath].alt = altMatch[1];
          }
          count++;
        } catch {}
      }

      console.log(` ${count} images`);
      await sleep(500);
    } catch (err) {
      console.log(` Error: ${err.message}`);
    }
  }

  return manifest;
}

// ─── Phase 4: Recover a single image ───

async function recoverImage(imgPath, manifest) {
  const localPath = path.join(IMAGES_DIR, imgPath.replace(/^\//, ''));
  const dir = path.dirname(localPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Try 4a: Exact URL from manifest
  if (manifest[imgPath]) {
    try {
      const { status, contentType, body } = await fetchUrl(manifest[imgPath].url);
      if (status === 200 && body.length > 5000 && contentType.includes('image')) {
        fs.writeFileSync(localPath, body);
        return { ok: true, url: manifest[imgPath].url, method: 'exact', size: body.length };
      }
    } catch {}
  }

  // Try 4b: Same filename from manifest (case-insensitive stem match)
  const stem = path.basename(imgPath).replace(/\.\w+$/, '').toLowerCase();
  for (const [mPath, mData] of Object.entries(manifest)) {
    const mStem = path.basename(mPath).replace(/\.\w+$/, '').toLowerCase();
    if (mStem === stem && mPath !== imgPath) {
      try {
        const { status, contentType, body } = await fetchUrl(mData.url);
        if (status === 200 && body.length > 5000 && contentType.includes('image')) {
          fs.writeFileSync(localPath, body);
          return { ok: true, url: mData.url, method: 'stem-match', size: body.length };
        }
      } catch {}
    }
  }

  // Try 4c: Same-page topic match
  if (manifest[imgPath] && manifest[imgPath].pages.length > 0) {
    for (const page of manifest[imgPath].pages) {
      for (const [mPath, mData] of Object.entries(manifest)) {
        if (mData.pages.includes(page) && mPath !== imgPath) {
          try {
            const { status, contentType, body } = await fetchUrl(mData.url);
            if (status === 200 && body.length > 5000 && contentType.includes('image')) {
              fs.writeFileSync(localPath, body);
              return { ok: true, url: mData.url, method: 'page-match', size: body.length };
            }
          } catch {}
        }
      }
    }
  }

  // Try 4d: Any large image from manifest
  const sortedManifest = Object.entries(manifest)
    .filter(([, m]) => m.pages.length > 0)
    .sort((a, b) => b[1].pages.length - a[1].pages.length);

  for (const [mPath, mData] of sortedManifest) {
    if (mPath === imgPath) continue;
    try {
      const { status, contentType, body } = await fetchUrl(mData.url);
      if (status === 200 && body.length > 10000 && contentType.includes('image')) {
        fs.writeFileSync(localPath, body);
        return { ok: true, url: mData.url, method: 'best-available', size: body.length };
      }
    } catch {}
  }

  return { ok: false, url: null, method: 'failed', size: 0 };
}

// ─── Phase 5: Verify with sharp ───

async function verifyImage(filePath) {
  try {
    const sharp = require('sharp');
    const metadata = await sharp(filePath).metadata();
    return {
      ok: metadata.width > 0 && metadata.height > 0,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ─── MAIN ───

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const download = args.includes('--download');
  const verifyOnly = args.includes('--verify-only');

  console.log('=== IMAGE RECOVERY SCRIPT ===\n');

  // Phase 1: Get needed images
  console.log('Phase 1: Collecting needed images from codebase...');
  const needed = getNeededImages();
  console.log(`  Found ${needed.size} images referenced in code\n`);

  // Phase 2: Check local
  console.log('Phase 2: Checking local existence...');
  const local = getLocalStatus(needed);
  const missing = local.filter(l => l.status === 'missing');
  const tooSmall = local.filter(l => l.status === 'too-small');
  const ok = local.filter(l => l.status === 'ok');
  console.log(`  OK: ${ok.length}, Missing: ${missing.length}, Too small: ${tooSmall.length}\n`);

  if (missing.length > 0) {
    console.log('  Missing images:');
    missing.forEach(m => console.log(`    ${m.path}  (from ${m.source}:${m.context})`));
    console.log();
  }
  if (tooSmall.length > 0) {
    console.log('  Too small (<1KB):');
    tooSmall.forEach(m => console.log(`    ${m.path} (${m.size} bytes)`));
    console.log();
  }

  if (verifyOnly) {
    console.log('Phase 3: Verifying existing images...');
    let verified = 0, failed = 0;
    for (const item of ok) {
      const v = await verifyImage(item.localPath);
      if (v.ok) verified++;
      else {
        failed++;
        console.log(`    ✗ ${item.path}: ${v.error || 'invalid'}`);
      }
    }
    console.log(`  Verified: ${verified}, Failed: ${failed}\n`);
    return;
  }

  if (dryRun) {
    console.log('  Run with --download to recover missing images\n');
    return;
  }

  if (download) {
    // Phase 3: Crawl site
    console.log('Phase 3: Crawling santoshchoubey.com for image manifest...');
    const manifest = await crawlSite();
    console.log(`  Found ${Object.keys(manifest).length} images on source site\n`);

    // Save manifest
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
    console.log(`  Saved manifest to ${MANIFEST_PATH}\n`);

    // Phase 4: Recover
    console.log('Phase 4: Recovering missing images...');
    const toRecover = [...missing, ...tooSmall];
    const results = [];
    for (let i = 0; i < toRecover.length; i++) {
      const item = toRecover[i];
      process.stdout.write(`  [${i + 1}/${toRecover.length}] ${item.path}...`);
      const result = await recoverImage(item.path, manifest);
      results.push({ ...item, ...result });
      console.log(` ${result.ok ? '✓' : '✗'} ${result.method}${result.ok ? ` (${result.size} bytes)` : ''}`);
      await sleep(200);
    }

    // Phase 5: Verify
    console.log('\nPhase 5: Verifying recovered images...');
    let verified = 0, failedV = 0;
    for (const item of results.filter(r => r.ok)) {
      const v = await verifyImage(item.localPath);
      if (v.ok) {
        verified++;
        console.log(`    ✓ ${item.path} (${v.width}x${v.height})`);
      } else {
        failedV++;
        console.log(`    ✗ ${item.path}: ${v.error || 'invalid'}`);
      }
    }
    console.log(`  Verified: ${verified}, Failed: ${failedV}\n`);

    // Phase 6: Deduplication check
    console.log('Phase 6: Deduplication check...');
    const hashes = new Map();
    let dupeCount = 0;
    const allFiles = [];
    function walkDir(dir) {
      for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
        const fp = path.join(dir, f.name);
        if (f.isDirectory()) walkDir(fp);
        else if (/\.(webp|jpg|png)$/i.test(f.name)) allFiles.push(fp);
      }
    }
    walkDir(IMAGES_DIR);
    for (const fp of allFiles) {
      try {
        const buf = fs.readFileSync(fp);
        const h = sha256(buf);
        const rel = path.relative(IMAGES_DIR, fp).replace(/\\/g, '/');
        if (hashes.has(h)) {
          console.log(`  Duplicate: ${rel} === ${hashes.get(h)}`);
          dupeCount++;
        } else {
          hashes.set(h, rel);
        }
      } catch {}
    }
    console.log(`  Duplicates found: ${dupeCount}\n`);

    // Final report
    console.log('=== RECOVERY REPORT ===');
    console.log(`Total needed: ${needed.size}`);
    console.log(`Already OK: ${ok.length}`);
    console.log(`Recovered: ${results.filter(r => r.ok).length}`);
    console.log(`Failed: ${results.filter(r => !r.ok).length}`);
    if (results.filter(r => !r.ok).length > 0) {
      console.log('\nFailed images:');
      results.filter(r => !r.ok).forEach(r => console.log(`  ${r.path}`));
    }
  } else {
    console.log('  Run with --download to recover missing images\n');
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
