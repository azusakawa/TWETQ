/**
 * Podcast Bot — Episode management, editorial content, stock tracker.
 *
 * CLI usage:
 *   node scripts/bots/podcast-bot.mjs latest            # latest episode info
 *   node scripts/bots/podcast-bot.mjs episodes           # all episodes
 *   node scripts/bots/podcast-bot.mjs stocks            # stocks tracked in podcast
 *   node scripts/bots/podcast-bot.mjs sources           # data source status
 *   node scripts/bots/podcast-bot.mjs summary            # episode summary with stale warning
 *   node scripts/bots/podcast-bot.mjs help
 */

const LOCAL_BASE = process.env.TWETQ_LOCAL_URL
  ? new URL(process.env.TWETQ_LOCAL_URL.endsWith('/') ? process.env.TWETQ_LOCAL_URL : `${process.env.TWETQ_LOCAL_URL}/`).href
  : 'http://127.0.0.1:8787/';

async function fetchJson(pathname) {
  const url = new URL(pathname, LOCAL_BASE);
  const res = await fetch(url.href, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${pathname}`);
  return res.json();
}

// Latest episode info
async function cmdLatest() {
  console.log('Latest Podcast Episode\n');
  try {
    const data = await fetchJson('/api/podcast/latest');
    if (!data.ok) {
      console.log('No podcast data available.');
      return;
    }
    const ep = data.episode || data.data || {};
    console.log(`Episode: ${ep.title || 'N/A'}`);
    console.log(`Date:    ${ep.date || ep.publishDate || ep.publish_date || ep.updatedAt || ep.sourceUpdatedAt || 'N/A'}`);
    console.log(`Status:  ${ep.stale ? '⚠ Data stale' : '✓ Fresh'}`);
    console.log(`Source:  ${ep.sourceLastUpdatedAt || ep.lastSourceUpdatedAt || ep.sourceUpdatedAt || 'N/A'}`);
    console.log('');
    if (ep.summary || ep.content) {
      const summary = ep.summary || ep.content;
      // Print first 500 chars
      const display = summary.length > 500 ? summary.substring(0, 500) + '...' : summary;
      console.log(display);
    }
    if (ep.stocks && Array.isArray(ep.stocks) && ep.stocks.length) {
      console.log(`\nStocks mentioned (${ep.stocks.length}):\n`);
      ep.stocks.forEach(s => {
        const code = s.code || s.stockCode || s.stock_code || '';
        const name = s.name || s.stockName || s.stock_name || '';
        console.log(`  ${code.padEnd(6)}  ${name}`);
      });
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}

// All episodes
async function cmdEpisodes() {
  console.log('All Podcast Episodes\n');
  try {
    const data = await fetchJson('/api/podcast/episodes');
    if (!data.ok || !data.episodes || !data.episodes.length) {
      console.log('No podcast episodes available.');
      return;
    }
    console.log(`${'Ep#'.padEnd(5)}  ${'Date'.padEnd(14)}  ${'Title'.padEnd(40)}  ${'Stale'.padEnd(8)}`);
    console.log('-'.repeat(70));
    data.episodes.slice().reverse().forEach((ep, i) => {
      const num = ep.episode || i + 1;
      const date = ep.date || ep.publishDate || ep.publish_date || ep.updatedAt || '';
      const title = (ep.title || '').substring(0, 38);
      const stale = ep.stale ? '⚠' : '✓';
      console.log(`${String(num).padEnd(5)}  ${date.padEnd(14)}  ${title.padEnd(40)}  ${stale}`);
    });
    console.log(`\nTotal: ${data.episodes.length} episodes`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}

// Stock tracker from podcast
async function cmdStocks() {
  console.log('Podcast Stock Tracker\n');
  try {
    const data = await fetchJson('/api/podcast/stocks');
    if (!data.ok || !data.stocks || !data.stocks.length) {
      console.log('No stock tracker data available.');
      return;
    }
    console.log(`${'Code'.padEnd(6)}  ${'Name'.padEnd(20)}  ${'Category'.padEnd(12)}  ${'Mention Count'.padEnd(15)}  ${'Market'.padEnd(8)}`);
    console.log('-'.repeat(65));
    data.stocks.forEach(s => {
      console.log(
        `${String(s.code).padEnd(6)}  ${(s.name || '').substring(0, 18).padEnd(20)}  ${(s.category || s.type || '').padEnd(12)}  ${(s.mentions || s.mentionCount || s.mention_count || 0).toString().padEnd(15)}  ${(s.market || 'TW').padEnd(8)}`
      );
    });
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}

// Data source status
async function cmdSources() {
  console.log('Data Source Status\n');
  try {
    // Check all API endpoints for availability
    const checks = [
      { name: 'Podcast Latest', url: '/api/podcast/latest' },
      { name: 'Podcast Episodes', url: '/api/podcast/episodes' },
      { name: 'Podcast Stocks', url: '/api/podcast/stocks' },
      { name: 'Market Snapshot', url: '/api/market/snapshot' },
      { name: 'Market Indexes', url: '/api/market/indexes' },
      { name: 'Public Config', url: '/api/public-config' },
    ];
    const results = await Promise.all(
      checks.map(async (check) => {
        try {
          const data = await fetchJson(check.url);
          return { ...check, ok: data.ok !== false, data };
        } catch {
          return { ...check, ok: false, data: null };
        }
      })
    );
    results.forEach(r => {
      console.log(`${r.ok ? '✓' : '✗'} ${r.name}: ${r.ok ? 'Available' : 'Unreachable'}`);
    });
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}

// Summary with staleness
async function cmdSummary() {
  console.log('Podcast Summary (with freshness check)\n');
  try {
    const [latestData] = await Promise.all([
      fetchJson('/api/podcast/latest'),
    ]);
    if (!latestData.ok) {
      console.log('No podcast data available.');
      return;
    }
    const ep = latestData.episode || latestData.data || {};
    const now = new Date();
    const sourceUpdatedAt = ep.sourceUpdatedAt || ep.sourceLastUpdatedAt || ep.lastSourceUpdatedAt;
    let stale = false;
    let staleMsg = '';
    if (ep.stale) {
      stale = true;
      staleMsg = '  ⚠ WARNING: Data is stale';
    }
    if (sourceUpdatedAt) {
      const srcDate = new Date(sourceUpdatedAt);
      const hoursDiff = (now - srcDate) / (1000 * 60 * 60);
      if (hoursDiff > 24) {
        stale = true;
        staleMsg = `  ⚠ WARNING: Source last updated ${Math.floor(hoursDiff)}h ago — data may be outdated`;
      }
    }
    console.log(`Title: ${ep.title || 'N/A'}`);
    console.log(`Date:  ${ep.date || ep.publishDate || 'N/A'}`);
    console.log(sourceUpdatedAt ? `Source Updated: ${sourceUpdatedAt}` : 'Source Updated: N/A');
    if (stale) console.log(staleMsg);
    console.log('');
    if (ep.summary || ep.content) {
      const summary = ep.summary || ep.content;
      const display = summary.length > 800 ? summary.substring(0, 800) + '\n...' : summary;
      console.log(display);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}

async function cmdHelp() {
  console.log(`TWETQ Podcast Bot
=================

Commands:
  podcast-bot latest         Latest podcast episode (summary + stocks)
  podcast-bot episodes       All podcast episodes list
  podcast-bot stocks         Stocks tracked across all podcast episodes
  podcast-bot sources        Check all API endpoints availability
  podcast-bot summary        Episode summary with staleness warning

Environment:
  TWETQ_LOCAL_URL       Override local server URL (default: http://127.0.0.1:8787)
`);
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length || args.includes('help')) {
    return cmdHelp();
  }
  const cmd = args[0].toLowerCase();
  switch (cmd) {
    case 'latest':     await cmdLatest();  break;
    case 'episodes':   await cmdEpisodes();  break;
    case 'stocks':     await cmdStocks();  break;
    case 'sources':    await cmdSources();  break;
    case 'summary':    await cmdSummary();  break;
    default:
      console.error(`Unknown command: ${cmd}`);
      console.log('Run "podcast-bot help" for usage.');
      process.exitCode = 1;
  }
}

main().catch((err) => { console.error(err); process.exitCode = 1; });
