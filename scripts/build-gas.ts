import { execSync } from 'node:child_process';
import { readFileSync, mkdirSync, rmSync, copyFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const DIST_DIR = join(ROOT, 'dist');
const GAS_DIST_DIR = join(ROOT, 'gas-dist');
const GAS_DIR = join(ROOT, 'gas');

const log = (msg: string) => console.log(`[build-gas] ${msg}`);

function main() {
  log('Building single-file HTML via vite-plugin-singlefile...');
  execSync('bunx vite build --config vite.config.gas.ts', {
    cwd: ROOT,
    stdio: 'inherit',
  });

  const indexHtmlPath = join(DIST_DIR, 'index.html');
  const indexHtml = readFileSync(indexHtmlPath, 'utf-8');

  const hasExternalScripts = /<script[^>]+src=/.test(indexHtml);
  const hasExternalStyles = /<link[^>]+rel="stylesheet"/.test(indexHtml);
  if (hasExternalScripts || hasExternalStyles) {
    console.warn('[build-gas] WARNING: index.html contains external references (scripts:', hasExternalScripts, 'stylesheets:', hasExternalStyles, ')');
  }

  const extraFiles = readdirSync(DIST_DIR).filter(f => f !== 'index.html');
  if (extraFiles.length > 0) {
    log(`dist/ has extra files (${extraFiles.join(', ')}), not included in gas-dist/`);
  }

  rmSync(GAS_DIST_DIR, { recursive: true, force: true });
  mkdirSync(GAS_DIST_DIR, { recursive: true });

  copyFileSync(join(ROOT, 'appsscript.json'), join(GAS_DIST_DIR, 'appsscript.json'));
  copyFileSync(join(GAS_DIR, 'Code.js'), join(GAS_DIST_DIR, 'Code.js'));
  copyFileSync(indexHtmlPath, join(GAS_DIST_DIR, 'index.html'));

  log('gas-dist/ assembled:');
  for (const f of readdirSync(GAS_DIST_DIR)) {
    const kb = (readFileSync(join(GAS_DIST_DIR, f)).length / 1024).toFixed(1);
    log(`  ${f} (${kb} KB)`);
  }

  log('Done. Push with: clasp push');
}

main();
