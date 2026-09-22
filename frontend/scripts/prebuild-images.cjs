/**
 * Prebuild script — runs before `next build`.
 * Verifies all images referenced by the codebase exist and are valid.
 * Fails the build loudly if any are missing.
 *
 * Usage: node scripts/prebuild-images.cjs
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const IMAGES_DIR = path.join(ROOT_DIR, 'public');
const CONTENT_JSON_PATH = path.join(ROOT_DIR, '..', 'content.json');

function getNeededImages() {
  const needed = new Map();

  function add(imgPath, source) {
    if (!needed.has(imgPath)) needed.set(imgPath, source);
  }

  // From content.json
  const contentJson = JSON.parse(fs.readFileSync(CONTENT_JSON_PATH, 'utf8'));
  function findImages(obj) {
    if (!obj) return;
    if (typeof obj === 'string' && obj.startsWith('/images/')) { add(obj, 'content.json'); return; }
    if (Array.isArray(obj)) { obj.forEach(findImages); return; }
    if (typeof obj === 'object') Object.values(obj).forEach(findImages);
  }
  findImages(contentJson);

  // From content.ts
  const contentTs = fs.readFileSync(path.join(ROOT_DIR, 'src', 'lib', 'content.ts'), 'utf8');
  const imgRe = /["'](\/images\/[^"']+)["']/g;
  let m;
  while ((m = imgRe.exec(contentTs)) !== null) add(m[1], 'content.ts');

  // From Cover.tsx
  const coverPath = path.join(ROOT_DIR, 'src', 'components', 'Cover.tsx');
  if (fs.existsSync(coverPath)) {
    const cover = fs.readFileSync(coverPath, 'utf8');
    let cm;
    const coverRe = /["'](\/images\/[^"']+)["']/g;
    while ((cm = coverRe.exec(cover)) !== null) add(cm[1], 'Cover.tsx');
  }

  return needed;
}

async function main() {
  console.log('Prebuild: Checking images...');
  const needed = getNeededImages();
  let ok = 0, missing = [];

  for (const [imgPath, source] of needed) {
    const localPath = path.join(IMAGES_DIR, imgPath.replace(/^\//, ''));
    if (fs.existsSync(localPath)) {
      const stat = fs.statSync(localPath);
      if (stat.size > 500) {
        ok++;
      } else {
        missing.push({ path: imgPath, source, reason: `too small (${stat.size} bytes)` });
      }
    } else {
      missing.push({ path: imgPath, source, reason: 'file not found' });
    }
  }

  if (missing.length > 0) {
    console.error(`\nPrebuild FAILED: ${missing.length} image(s) missing or invalid:\n`);
    for (const m of missing) {
      console.error(`  ${m.path}  (${m.source}) — ${m.reason}`);
    }
    console.error('\nRun: node scripts/recover-images.cjs --download\n');
    process.exit(1);
  }

  console.log(`  ✓ All ${ok} images present\n`);
}

main().catch(err => {
  console.error('Prebuild error:', err);
  process.exit(1);
});
