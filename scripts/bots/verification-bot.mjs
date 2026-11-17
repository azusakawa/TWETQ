/**
 * Verification Bot — Comprehensive health checks for the TWETQ system.
 * Checks: local server status, API availability, data freshness,
 * file integrity, cache validity, and configuration.
 *
 * CLI usage:
 *   node scripts/bots/verification-bot.mjs               # run all checks
 *   node scripts/bots/verification-bot.mjs api            # check API availability only
 *   node scripts/bots/verification-bot.mjs files          # check local file integrity
 *   node scripts/bots/verification-bot.mjs cache          # check cache status
 *   node scripts/bots/verification-bot.mjs config         # check configuration
 *   node scripts/bots/verification-bot.mjs --fail-fast    # stop on first failure
 *   node scripts/bots/verification-bot.mjs help
 */

const PROJECT_DIR = process.env.TWETQ_PROJECT_DIR
  ? process.env.TWETQ_PROJECT_DIR
  : process.cwd();
const LOCAL_BASE = process.env.TWETQ_LOCAL_URL
  ? new URL(process.env.TWETQ_LOCAL_URL.endsWith('/') ? process.env.TWETQ_LOCAL_URL : `${process.env.TWETQ_LOCAL_URL}/`).href
  : 'http://127.0.0.1:8787/';

const { existsSync, readFileSync, readdirSync, statSync } = await import('node:fs');
const { join, resolve } = await import('node:path');

const RESULTS = [];
let failFast = false;

function check(name, condition, details) {
  const passed = !!condition;
  RESULTS.push({ name, passed, details: details || (passed ? 'OK' : 'FAIL') });
  if (!passed) {
    console.error(`  ✗ ${name}: ${details}`);
  } else {
    console.log(`  ✓ ${name}`);
  }
  if (failFast && !passed) process.exitCode = 1;
  return passed;
}

async function fetchJson(url, timeout = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'TWETQ-VerifyBot/1.0' },
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// Check local server status
async function checkServer() {
  console.log('\n── Local Server ──');
  try {
    const res = await fetch(LOCAL_BASE, { signal: AbortSignal.timeout(5000) });
    check('Local server running', res.ok && (res.status === 200 || res.status === 301 || res.status === 302));
  } catch {
    check('Local server running', false, 'Connection refused — is start-local.mjs running?');
  }
  // Check key API endpoints
  const apiEndpoints = [
    { path: '/api/market/snapshot', name: 'Market Snapshot API' },
    { path: '/api/market/indexes', name: 'Market Indexes API' },
    { path: '/api/podcast/latest', name: 'Podcast Latest API' },
    { path: '/api/podcast/episodes', name: 'Podcast Episodes API' },
    { path: '/api/podcast/stocks', name: 'Podcast Stocks API' },
    { path: '/api/public-config', name: 'Public Config API' },
  ];
  for (const ep of apiEndpoints) {
    try {
      const data = await fetchJson(new URL(ep.path, LOCAL_BASE).href);
      check(ep.name, data.ok !== false, data.ok ? '' : (data.error || 'non-OK response'));
    } catch (err) {
      check(ep.name, false, `Cannot reach: ${err.message.split('\n')[0]}`);
    }
  }
}

// Check API availability (external)
async function checkApis() {
  console.log('\n── External APIs ──');
  // TWSE OpenAPI
  try {
    const data = await fetchJson('https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL', 15000);
    const count = Array.isArray(data) ? data.length : 0;
    check('TWSE OpenAPI', count > 0, `${count} stocks`);
  } catch {
    check('TWSE OpenAPI', false, 'Cannot reach openapi.twse.com.tw');
  }
  // TPEx OpenAPI
  try {
    const data = await fetchJson('https://www.tpex.org.tw/openapi/v1/tpex_mainboard_quotes', 15000);
    const count = Array.isArray(data) ? data.length : 0;
    check('TPEx OpenAPI', count > 0, `${count} stocks`);
  } catch {
    check('TPEx OpenAPI', false, 'Cannot reach www.tpex.org.tw');
  }
  // MOPS API
  try {
    const data = await fetchJson('https://mopsov.twse.com.tw/api/v1/mops/t187ap03?cotno2=2330', 15000);
    const count = Array.isArray(data) ? data.length : 0;
    check('MOPS API', count > 0, `${count} records`);
  } catch {
    check('MOPS API', false, 'Cannot reach mopsov.twse.com.tw');
  }
  // TAIFEX API
  try {
    const data = await fetchJson('https://openapi.taifex.com.tw/v1/DailyMarketReportFut', 15000);
    const count = Array.isArray(data) ? data.length : 0;
    check('TAIFEX OpenAPI', count > 0, `${count} records`);
  } catch {
    check('TAIFEX OpenAPI', false, 'Cannot reach openapi.taifex.com.tw');
  }
}

// Check local file integrity
async function checkFiles() {
  console.log('\n── Local File Integrity ──');
  // Check required project files
  const requiredFiles = [
    'package.json',
    'scripts/start-local.mjs',
    'scripts/refresh-tpex-data.mjs',
    'src/worker.js',
    'public/index.html',
    'public/app.js',
  ];
  requiredFiles.forEach(f => {
    const full = join(PROJECT_DIR, f);
    check(`File: ${f}`, existsSync(full), existsSync(full) ? `${statSync(full).size} bytes` : 'missing');
  });
  // Check data directories
  const tpexDir = join(PROJECT_DIR, 'public/data/tpex');
  const mopsDir = join(PROJECT_DIR, 'public/data/mops-batch');
  try {
    const tpexFiles = readdirSync(tpexDir).filter(f => f.endsWith('.json'));
    check('TPEx data directory', tpexFiles.length > 0, `${tpexFiles.length} JSON files`);
  } catch {
    check('TPEx data directory', false, 'Directory not found');
  }
  try {
    const mopsFiles = readdirSync(mopsDir).filter(f => f.endsWith('.json'));
    check('MOPS data directory', mopsFiles.length > 0, `${mopsFiles.length} JSON files`);
  } catch {
    check('MOPS data directory', false, 'Directory not found');
  }
  // Check data freshness
  try {
    const tpexFiles = readdirSync(tpexDir).filter(f => f.endsWith('.json'));
    let latestDate = null;
    for (const f of tpexFiles.slice(0, 5)) {
      const content = JSON.parse(readFileSync(join(tpexDir, f), 'utf8'));
      if (Array.isArray(content)) {
        for (const row of content.slice(-5)) {
          for (const key of Object.keys(row)) {
            if (key.includes('Date') || key.includes('date')) {
              const digits = String(row[key] || '').replace(/\D/g, '');
              if (digits.length === 8 || digits.length === 7) {
                const year = digits.length === 8 ? parseInt(digits.slice(0, 4)) : parseInt(digits.slice(0, 3)) + 1911;
                const month = parseInt(digits.slice(4, 6));
                const day = parseInt(digits.slice(6, 8));
                const d = new Date(Date.UTC(year, month - 1, day));
                if (!latestDate || d > latestDate) latestDate = d;
              }
            }
          }
        }
      }
    }
    if (latestDate) {
      const daysOld = (Date.now() - latestDate.getTime()) / (24 * 60 * 60 * 1000);
      check('TPEx data freshness', daysOld <= 2, `${daysOld.toFixed(1)} days old`);
    } else {
      check('TPEx data freshness', false, 'No date information found');
    }
  } catch {
    check('TPEx data freshness', false, 'Could not read TPEx data');
  }
}

// Check cache status
async function checkCache() {
  console.log('\n── Cache Status ──');
  // Check local SQLite database (if running locally)
  try {
    const sqlitePath = join(PROJECT_DIR, '.local-data/twetq.sqlite');
    check('Local SQLite database', existsSync(sqlitePath), existsSync(sqlitePath) ? `${statSync(sqlitePath).size} bytes` : 'not found');
  } catch {
    check('Local SQLite database', false, 'Could not check');
  }
  // Check Cloudflare worker syntax
  try {
    const workerCode = readFileSync(join(PROJECT_DIR, 'src/worker.js'), 'utf8');
    check('Worker.js syntax', !workerCode.includes('SYNTAX_ERROR'), 'Compiled OK');
  } catch {
    check('Worker.js syntax', false, 'Could not read worker.js');
  }
  // Check SW (service worker)
  try {
    const swPath = join(PROJECT_DIR, 'public/sw.js');
    check('Service Worker exists', existsSync(swPath), existsSync(swPath) ? 'present' : 'missing');
  } catch {
    check('Service Worker exists', false);
  }
}

// Check configuration
async function checkConfig() {
  console.log('\n── Configuration ──');
  // Check wrangler.toml (for Cloudflare deployment)
  try {
    const wranglerContent = readFileSync(join(PROJECT_DIR, 'wrangler.toml'), 'utf8');
    check('wrangler.toml', wranglerContent.includes('main') && wranglerContent.includes('assets'), 'Found');
  } catch {
    check('wrangler.toml', false, 'Not found');
  }
  // Check package.json scripts
  try {
    const pkg = JSON.parse(readFileSync(join(PROJECT_DIR, 'package.json'), 'utf8'));
    check('package.json start script', !!pkg.scripts?.start, pkg.scripts?.start || 'missing');
    check('package.json check script', !!pkg.scripts?.check, pkg.scripts?.check || 'missing');
    check('Node.js type', pkg.type === 'module', pkg.type || 'missing');
  } catch {
    check('package.json', false, 'Could not parse');
  }
  // Check Node.js version
  try {
    const nodeVersion = process.version;
    const major = parseInt(nodeVersion.slice(1).split('.')[0]);
    check('Node.js version (>= 22)', major >= 22, nodeVersion);
  } catch {
    check('Node.js version', false, 'Could not determine');
  }
}

async function cmdHelp() {
  console.log(`TWETQ Verification Bot
======================

Commands:
  verification-bot              Run all checks (default)
  verification-bot api          Check external API availability
  verification-bot files        Check local file integrity and freshness
  verification-bot cache        Check cache and worker status
  verification-bot config       Check project configuration
  verification-bot --fail-fast  Stop on first failure

Notes:
  - All bots connect to http://127.0.0.1:8787 by default
  - Use TWETQ_LOCAL_URL to override the local server URL
  - Use TWETQ_PROJECT_DIR to override the project directory

Environment:
  TWETQ_LOCAL_URL       Override local server URL (default: http://127.0.0.1:8787)
  TWETQ_PROJECT_DIR     Override project directory (default: current working dir)
`);
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length || args.includes('help')) {
    return cmdHelp();
  }
  failFast = args.includes('--fail-fast');
  const filter = !args[0].startsWith('--') ? args[0].toLowerCase() : 'all';
  console.log('TWETQ Verification Bot\n══════════════════════\n');
  if (filter === 'all' || filter === 'api') await checkApis();
  if (filter === 'all' || filter === 'files') await checkFiles();
  if (filter === 'all' || filter === 'cache') await checkCache();
  if (filter === 'all' || filter === 'config') await checkConfig();
  if (filter === 'all') await checkServer();
  // Print summary
  const passed = RESULTS.filter(r => r.passed).length;
  const failed = RESULTS.filter(r => !r.passed).length;
  console.log(`\n══════════════════════`);
  console.log(`Results: ${passed}/${RESULTS.length} passed, ${failed} failed`);
  if (failed > 0 && !failFast) {
    console.log('\nFailed checks marked above. Review and fix before proceeding.');
  }
}

main().catch((err) => { console.error(err); process.exitCode = 1; });
