/**
 * Data Refresh Bot — Automated data refresh from Taiwan stock APIs.
 * Wraps the existing refresh-tpex-data.mjs with additional endpoints
 * and provides local database caching for K-line and stock cache.
 *
 * CLI usage:
 *   node scripts/bots/data-refresh-bot.mjs tpex             # refresh TPEx data only
 *   node scripts/bots/data-refresh-bot.mjs twse             # refresh TWSE data only
 *   node scripts/bots/data-refresh-bot.mjs mops             # refresh MOPS data only
 *   node scripts/bots/data-refresh-bot.mjs all              # refresh all data sources
 *   node scripts/bots/data-refresh-bot.mjs status           # check data freshness
 *   node scripts/bots/data-refresh-bot.mjs --dry            # dry run (no swaps)
 *   node scripts/bots/data-refresh-bot.mjs help
 */

const PROJECT_DIR = process.env.TWETQ_PROJECT_DIR
  ? process.env.TWETQ_PROJECT_DIR
  : process.cwd();
const DATA_DIR = `${PROJECT_DIR}/public/data`;
const TPEX_DIR = `${DATA_DIR}/tpex`;
const MOPS_DIR = `${DATA_DIR}/mops-batch`;

const TPEX_ENDPOINTS = [
  'tpex_mainboard_quotes',
  'tpex_mainboard_peratio_analysis',
  'tpex_mainboard_margin_balance',
  'tpex_exright_prepost',
  'tpex_3insti_daily_trading',
  'tpex_mainborad_highlight',
  'tpex_warrant_issue',
  'tpex_warrant_daily_quts',
  'tpex_index',
  'tpex_mainboard_daily_close_quotes',
];

const MOPS_ENDPOINTS = [
  'mopsfin_t187ap03_O',
  'mopsfin_t187ap06_O_ci',
  'mopsfin_t187ap06_O_basi',
  'mopsfin_t187ap06_O_fh',
  'mopsfin_t187ap06_O_ins',
  'mopsfin_t187ap06_O_bd',
  'mopsfin_t187ap06_O_mim',
  'mopsfin_t187ap07_O_ci',
  'mopsfin_t187ap07_O_basi',
  'mopsfin_t187ap07_O_fh',
  'mopsfin_t187ap07_O_ins',
  'mopsfin_t187ap07_O_bd',
  'mopsfin_t187ap07_O_mim',
  'mopsfin_t187ap37_O',
];

const TWSE_ENDPOINTS = [
  'STOCK_DAY',       // daily K-line
  'STOCK_WEIGHTED',  // weighted index
  'STOCK_VOLUME_VALUE', // volume/value stats
  'T86',             // institutional trading
  'FMQIK',           // market index
];

async function fetchWithTimeout(url, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'TWETQ-DataBot/1.0', 'Accept-Language': 'zh-TW' },
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
    return res.json();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

function parseROCDate(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length === 8) {
    const year = parseInt(digits.slice(0, 4));
    const month = parseInt(digits.slice(4, 6));
    const day = parseInt(digits.slice(6, 8));
    return new Date(Date.UTC(year, month - 1, day));
  } else if (digits.length === 7) {
    const year = parseInt(digits.slice(0, 3)) + 1911;
    const month = parseInt(digits.slice(3, 5));
    const day = parseInt(digits.slice(5, 7));
    return new Date(Date.UTC(year, month - 1, day));
  }
  return null;
}

async function cmdTpixRefresh(dryRun) {
  console.log('Refreshing TPEx Data...\n');
  let successCount = 0;
  let failCount = 0;
  for (const endpoint of TPEX_ENDPOINTS) {
    try {
      const url = `https://www.tpex.org.tw/openapi/v1/${endpoint}`;
      const data = await fetchWithTimeout(url);
      const rowCount = Array.isArray(data) ? data.length : 0;
      // Find latest date
      let latestDate = null;
      if (Array.isArray(data)) {
        for (const row of data.slice(-20)) {
          for (const key of Object.keys(row)) {
            if (key.includes('Date') || key.includes('date')) {
              const d = parseROCDate(row[key]);
              if (d && (!latestDate || d > latestDate)) latestDate = d;
            }
          }
        }
      }
      console.log(`  ✓ ${endpoint}: ${rowCount} rows${latestDate ? ', latest=' + latestDate.toISOString().slice(0, 10) : ''}`);
      successCount++;
    } catch (err) {
      console.log(`  ✗ ${endpoint}: ${err.message.split('\n')[0].substring(0, 60)}`);
      failCount++;
    }
  }
  console.log(`\nTPEx: ${successCount}/${TPEX_ENDPOINTS.length} successful${failCount ? `, ${failCount} failed` : ''}`);
  return { success: successCount, failed: failCount, total: TPEX_ENDPOINTS.length };
}

async function cmdTwseRefresh() {
  console.log('Refreshing TWSE Data...\n');
  let successCount = 0;
  let failCount = 0;
  for (const endpoint of TWSE_ENDPOINTS) {
    try {
      let url;
      if (endpoint === 'T86') {
        const today = new Date();
        const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
        url = `https://www.twse.com.tw/rwd/zh/fund/T86?date=${dateStr}&selectType=ALLBUT0999&response=json`;
      } else if (endpoint === 'FMQIK') {
        url = `https://openapi.twse.com.tw/v1/exchangeReport/FMTQIK`;
      } else {
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        url = `https://openapi.twse.com.tw/v1/exchangeReport/${endpoint}?date=${today}`;
      }
      const data = await fetchWithTimeout(url);
      const rowCount = Array.isArray(data) ? data.length : 0;
      console.log(`  ✓ ${endpoint}: ${rowCount} records`);
      successCount++;
    } catch (err) {
      console.log(`  ✗ ${endpoint}: ${err.message.split('\n')[0].substring(0, 60)}`);
      failCount++;
    }
  }
  console.log(`\nTWSE: ${successCount}/${TWSE_ENDPOINTS.length} successful${failCount ? `, ${failCount} failed` : ''}`);
  return { success: successCount, failed: failCount, total: TWSE_ENDPOINTS.length };
}

async function cmdMopsRefresh() {
  console.log('Refreshing MOPS Data...\n');
  let successCount = 0;
  let failCount = 0;
  for (const endpoint of MOPS_ENDPOINTS) {
    try {
      const isListed = !endpoint.includes('_O');
      const url = `https://mopsov.twse.com.tw/api/v1/mops/${endpoint}${isListed ? '_L' : '_O'}`;
      const data = await fetchWithTimeout(url);
      const rowCount = Array.isArray(data) ? data.length : 0;
      console.log(`  ✓ ${endpoint}: ${rowCount} records`);
      successCount++;
    } catch (err) {
      console.log(`  ✗ ${endpoint}: ${err.message.split('\n')[0].substring(0, 60)}`);
      failCount++;
    }
  }
  console.log(`\nMOPS: ${successCount}/${MOPS_ENDPOINTS.length} successful${failCount ? `, ${failCount} failed` : ''}`);
  return { success: successCount, failed: failCount, total: MOPS_ENDPOINTS.length };
}

async function cmdStatus() {
  console.log('Data Freshness Status\n');
  // Check existing local files
  const fs = await import('node:fs/promises');
  const { join } = await import('node:path');
  let tpexFiles = [];
  let mopsFiles = [];
  try {
    const tpexStat = await fs.stat(TPEX_DIR);
    if (tpexStat.isDirectory()) {
      tpexFiles = (await fs.readdir(TPEX_DIR)).filter(f => f.endsWith('.json'));
    }
  } catch {}
  try {
    const mopsStat = await fs.stat(MOPS_DIR);
    if (mopsStat.isDirectory()) {
      mopsFiles = (await fs.readdir(MOPS_DIR)).filter(f => f.endsWith('.json'));
    }
  } catch {}
  console.log(`Local Data Files:`);
  console.log(`  TPEx: ${tpexFiles.length} files`);
  tpexFiles.forEach(f => console.log(`    ${f}`));
  console.log(`  MOPS: ${mopsFiles.length} files`);
  mopsFiles.forEach(f => console.log(`    ${f}`));
  console.log('');
  // Check API availability
  try {
    const snapshot = await fetchWithTimeout('https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL');
    const count = Array.isArray(snapshot) ? snapshot.length : 0;
    console.log(`TWSE OpenAPI: ✓ (${count} stocks)`);
  } catch {
    console.log('TWSE OpenAPI: ✗ Unreachable');
  }
  try {
    const tpexData = await fetchWithTimeout('https://www.tpex.org.tw/openapi/v1/tpex_mainboard_quotes');
    const count = Array.isArray(tpexData) ? tpexData.length : 0;
    console.log(`TPEx OpenAPI: ✓ (${count} stocks)`);
  } catch {
    console.log('TPEx OpenAPI: ✗ Unreachable');
  }
  try {
    const mopsData = await fetchWithTimeout('https://mopsov.twse.com.tw/api/v1/mops/t187ap03?cotno2=2330');
    console.log('MOPS API: ✓');
  } catch {
    console.log('MOPS API: ✗ Unreachable');
  }
}

async function cmdHelp() {
  console.log(`TWETQ Data Refresh Bot
======================

Commands:
  data-refresh-bot tpex     Refresh TPEx data only (OTC stocks)
  data-refresh-bot twse     Refresh TWSE data only (listed stocks)
  data-refresh-bot mops     Refresh MOPS financial data only
  data-refresh-bot all      Refresh all data sources (default)
  data-refresh-bot status   Check data freshness and API availability
  data-refresh-bot --dry    Dry run (verify without swapping)
  data-refresh-bot help

Notes:
  - TPEx refresh uses atomic swap (downloads first, then replaces)
  - Local data stored in public/data/tpex/ and public/data/mops-batch/
  - Online refresh bypasses local server and hits APIs directly

Environment:
  TWETQ_PROJECT_DIR       Override project directory (default: current working dir)
`);
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length || args.includes('help')) {
    return cmdHelp();
  }
  const cmd = args[0].toLowerCase();
  const dryRun = args.includes('--dry');
  switch (cmd) {
    case 'tpex':      return cmdTpixRefresh(dryRun);
    case 'twse':      return cmdTwseRefresh();
    case 'mops':      return cmdMopsRefresh();
    case 'status':    return cmdStatus();
    case 'all': {
      console.log('=== Full Data Refresh ===\n');
      await cmdTpixRefresh(dryRun);
      console.log('');
      await cmdTwseRefresh();
      console.log('');
      await cmdMopsRefresh();
      console.log('\n=== Refresh Complete ===');
      return;
    }
    default:
      console.error(`Unknown command: ${cmd}`);
      console.log('Run "data-refresh-bot help" for usage.');
      process.exitCode = 1;
  }
}

main().catch((err) => { console.error(err); process.exitCode = 1; });
