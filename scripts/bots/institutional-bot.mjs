/**
 * Institutional Radar Bot — 三大法人 (foreign, trust, dealer) fund flow analysis.
 *
 * CLI usage:
 *   node scripts/bots/institutional-bot.mjs 2330            # single stock institutional data
 *   node scripts/bots/institutional-bot.mjs --rank          # overall institutional ranking
 *   node scripts/bots/institutional-bot.mjs --sector        # sector-level institutional flow
 *   node scripts/bots/institutional-bot.mjs --net 100000000 # stocks with net foreign buying > 100M
 *   node scripts/bots/institutional-bot.mjs --concentrate 20  # fund concentration top 20
 *   node scripts/bots/institutional-bot.mjs help
 */

const LOCAL_BASE = process.env.TWETQ_LOCAL_URL
  ? new URL(process.env.TWETQ_LOCAL_URL.endsWith('/') ? process.env.TWETQ_LOCAL_URL : `${process.env.TWETQ_LOCAL_URL}/`).href
  : 'http://127.0.0.1:8787/';

async function fetchJson(pathname, signal) {
  const url = new URL(pathname, LOCAL_BASE);
  const res = await fetch(url.href, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${pathname}`);
  return res.json();
}

// Single stock institutional trading data
async function cmdSingleStock(code) {
  if (!code) {
    console.log('Usage: institutional-bot <stock-code> [--rank|--sector|--net <amount>--concentrate <n>]');
    return;
  }
  console.log(`Institutional Radar for ${code}\n`);
  try {
    const data = await fetchJson(`/api/institutional-radar?code=${encodeURIComponent(code)}`);
    if (!data.ok || !data.data) {
      console.log('No institutional data available for this stock.');
      return;
    }
    const rows = Array.isArray(data.data) ? data.data : [];
    if (!rows.length) {
      console.log('No institutional trading data available.');
      return;
    }
    // Determine market from code length
    const ex = code.length > 4 ? 'OTC' : 'TWSE';
    // Display daily institutional data
    console.log(`${ex} Institutional Daily Trading (${rows.length} days)\n`);
    // Header
    const headers = Object.keys(rows[0]);
    console.log(
      headers
        .map(h => h.padEnd(12))
        .join('  ')
    );
    console.log('-'.repeat(headers.reduce((sum, h) => sum + h.length, 0) + headers.length * 3));
    // Show last 10 days (most recent first)
    rows.slice(-10).reverse().forEach(row => {
      console.log(
        headers.map(h => String(row[h] ?? '').padEnd(12)).join('  ')
      );
    });
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}

// Overall institutional ranking — aggregates all stocks by net foreign flow
async function cmdRank() {
  console.log('Institutional Ranking (Top 50 by Net Foreign Flow)\n');
  try {
    const [snapshotData, radarData] = await Promise.all([
      fetchJson('/api/market/snapshot'),
      fetchJson('/api/institutional-radar'),
    ]);
    if (!snapshotData.ok || !snapshotData.quotes) {
      console.log('Failed to fetch market data.');
      return;
    }
    const quotes = new Map(snapshotData.quotes.map(q => [`${q.market}:${q.code}`, q]));

    if (radarData.ok && Array.isArray(radarData.data)) {
      const rows = radarData.data.filter(r => r.totalDiff !== undefined && Number(r.totalDiff));
      const ranked = rows
        .map(r => {
          const quote = quotes.get(`${r.market}:${r.code}`);
          const close = quote?.close || 0;
          const netForeign = parseFloat(close) * parseFloat(r.foreignDiff || 0);
          return { ...r, netForeign, code: r.code, name: r.stock?.name || r.stock?.stockName || r.cotname || r.stockName || r.name || r.stock_name || '' };
        })
        .filter(r => r.netForeign)
        .sort((a, b) => b.netForeign - a.netForeign)
        .slice(0, 50);

      console.log(`${'Code'.padEnd(6)}  ${'Name'.padEnd(16)}  ${'Foreign Net'.padEnd(14)}  ${'Trust Net'.padEnd(14)}  ${'Dealer Net'.padEnd(14)}  ${'Total Net'.padEnd(14)}`);
      console.log('-'.repeat(80));
      ranked.forEach(r => {
        const fmt = (v) => {
          const abs = Math.abs(v);
          return abs >= 1e8
            ? (v / 1e8).toFixed(2) + 'B'
            : abs >= 1e4
              ? (v / 1e4).toFixed(1) + 'K'
              : v.toFixed(0);
        };
        console.log(
          `${r.code.padEnd(6)}  ${String(r.name).substring(0, 14).padEnd(16)}  ${fmt(r.netForeign).padEnd(14)}  ${fmt(r.trustAmount || 0).padEnd(14)}  ${fmt(r.dealerAmount || 0).padEnd(14)}  ${fmt(r.amount || 0).padEnd(14)}`
        );
      });
    } else {
      console.log('No institutional ranking data available.');
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}

// Sector-level institutional flow analysis
async function cmdSector() {
  console.log('Sector-Level Institutional Flow Analysis\n');
  try {
    const [snapshotData, radarData] = await Promise.all([
      fetchJson('/api/market/snapshot'),
      fetchJson('/api/institutional-radar'),
    ]);
    if (!snapshotData.ok || !snapshotData.quotes) {
      console.log('Failed to fetch market data.');
      return;
    }
    const quotes = new Map(snapshotData.quotes.map(q => [`${q.market}:${q.code}`, q]));

    if (radarData.ok && Array.isArray(radarData.data)) {
      // Group by industry sector
      const sectorMap = new Map();
      for (const row of radarData.data) {
        const name = row.stock?.industryName || row.stock?.industry || row.industryName || row.industry || '未分類';
        const existing = sectorMap.get(name) || {
          name, foreignAmount: 0, trustAmount: 0, dealerAmount: 0, totalDiff: 0, count: 0,
          foreignMax: -Infinity, foreignMin: Infinity,
        };
        const close = parseFloat(quotes.get(`${row.market}:${row.code}`)?.close || 0) || 0;
        const fd = parseFloat(row.foreignDiff || 0) || 0;
        const td = parseFloat(row.trustDiff || 0) || 0;
        const dd = parseFloat(row.dealerDiff || 0) || 0;
        existing.foreignAmount += close * fd;
        existing.trustAmount += close * td;
        existing.dealerAmount += close * dd;
        existing.totalDiff += parseFloat(row.totalDiff || 0);
        existing.count += 1;
        if (fd > existing.foreignMax) existing.foreignMax = fd;
        if (fd < existing.foreignMin) existing.foreignMin = fd;
        sectorMap.set(name, existing);
      }
      const sorted = [...sectorMap.values()].sort((a, b) => b.foreignAmount - a.foreignAmount);
      console.log(`${'Sector'.padEnd(16)}  ${'Foreign Net'.padEnd(14)}  ${'Trust Net'.padEnd(14)}  ${'Dealer Net'.padEnd(14)}  ${'Stocks'.padEnd(8)}`);
      console.log('-'.repeat(66));
      sorted.forEach(s => {
        const fmt = (v) => {
          const abs = Math.abs(v);
          return abs >= 1e8
            ? (v / 1e8).toFixed(2) + 'B'
            : abs >= 1e4
              ? (v / 1e4).toFixed(1) + 'K'
              : v.toFixed(0);
        };
        console.log(
          `${s.name.substring(0, 14).padEnd(16)}  ${fmt(s.foreignAmount).padEnd(14)}  ${fmt(s.trustAmount).padEnd(14)}  ${fmt(s.dealerAmount).padEnd(14)}  ${s.count.toString().padEnd(8)}`
        );
      });
    } else {
      console.log('No institutional sector data available.');
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}

// Filter by net foreign flow threshold
async function cmdNet(amount) {
  const threshold = amount ? parseFloat(amount) : 1e8; // default 100M
  console.log(`Stocks with Net Foreign Buying > ${threshold >= 1e8 ? (threshold / 1e8).toFixed(1) + 'B' : (threshold / 1e4).toFixed(0) + 'K'}\n`);
  try {
    const [snapshotData, radarData] = await Promise.all([
      fetchJson('/api/market/snapshot'),
      fetchJson('/api/institutional-radar'),
    ]);
    if (!snapshotData.ok || !snapshotData.quotes || !radarData.ok || !radarData.data) {
      console.log('Failed to fetch data.');
      return;
    }
    const quotes = new Map(snapshotData.quotes.map(q => [`${q.market}:${q.code}`, q]));
    const matched = [];
    for (const row of radarData.data) {
      const close = parseFloat(quotes.get(`${row.market}:${row.code}`)?.close || 0) || 0;
      const foreignNet = close * parseFloat(row.foreignDiff || 0);
      if (foreignNet > threshold) {
        matched.push({
          code: row.code,
          name: row.stock?.name || row.stock?.stockName || row.cotname || row.stockName || row.name || row.stock_name || '',
          foreignNet,
          trustNet: (close * parseFloat(row.trustDiff || 0)),
          dealerNet: (close * parseFloat(row.dealerDiff || 0)),
        });
      }
    }
    matched.sort((a, b) => b.foreignNet - a.foreignNet);
    console.log(`${matched.length} matching stocks:\n`);
    console.log(`${'Code'.padEnd(6)}  ${'Name'.padEnd(16)}  ${'Foreign Net'.padEnd(14)}  ${'Trust Net'.padEnd(14)}`);
    console.log('-'.repeat(50));
    matched.slice(0, 100).forEach(r => {
      const fmt = (v) => {
        const abs = Math.abs(v);
        return abs >= 1e8
          ? (v / 1e8).toFixed(2) + 'B'
          : abs >= 1e4
            ? (v / 1e4).toFixed(1) + 'K'
            : v.toFixed(0);
      };
      console.log(
        `${r.code.padEnd(6)}  ${String(r.name).substring(0, 14).padEnd(16)}  ${fmt(r.foreignNet).padEnd(14)}  ${fmt(r.trustNet).padEnd(14)}`
      );
    });
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}

// Fund concentration top N
async function cmdConcentrate(n) {
  const limit = parseInt(n) || 20;
  console.log(`Fund Concentration Top ${limit}\n`);
  try {
    const [snapshotData] = await Promise.all([
      fetchJson('/api/market/snapshot'),
    ]);
    if (!snapshotData.ok || !snapshotData.quotes) {
      console.log('Failed to fetch market data.');
      return;
    }
    // Get top by volume (concentration proxy)
    const top = [...snapshotData.quotes]
      .filter(q => q.volume > 0)
      .sort((a, b) => b.volume - a.volume)
      .slice(0, limit);
    console.log(`${'Code'.padEnd(6)}  ${'Volume'.padEnd(14)}  ${'Value'.padEnd(14)}  ${'Change %'.padEnd(10)}`);
    console.log('-'.repeat(44));
    top.forEach(q => {
      const volStr = (q.volume / 1000).toFixed(0) + 'K';
      const valStr = q.value >= 1e8
        ? (q.value / 1e8).toFixed(2) + 'B'
        : q.value >= 1e4
          ? (q.value / 1e4).toFixed(1) + 'K'
          : q.value.toFixed(0);
      console.log(
        `${q.code.padEnd(6)}  ${volStr.padEnd(14)}  ${valStr.padEnd(14)}  ${(q.changePct || 0).toFixed(2).padEnd(10)}`
      );
    });
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}

async function cmdHelp() {
  console.log(`TWETQ Institutional Radar Bot
============================

Single Stock:
  institutional-bot <code>              Institutional trading data for a stock
  Example: institutional-bot 2330

Ranking:
  institutional-bot --rank              Overall ranking by net foreign flow (top 50)
  institutional-bot --sector            Sector-level institutional flow analysis
  institutional-bot --net 100000000     Stocks with foreign net buying > threshold (default: 100M)
  institutional-bot --concentrate 20    Fund concentration top 20 (by volume)

Environment:
  TWETQ_LOCAL_URL       Override local server URL (default: http://127.0.0.1:8787)
`);
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length || args.includes('help')) {
    return cmdHelp();
  }
  const code = !args[0].startsWith('--') ? args[0] : null;
  if (args.includes('--rank')) return cmdRank();
  if (args.includes('--sector')) return cmdSector();
  const netIdx = args.indexOf('--net');
  if (netIdx >= 0) return cmdNet(args[netIdx + 1]);
  const concIdx = args.indexOf('--concentrate');
  if (concIdx >= 0) return cmdConcentrate(args[concIdx + 1]);
  if (code) return cmdSingleStock(code);
  console.error('No valid command found. Run "institutional-bot help" for usage.');
  process.exitCode = 1;
}

main().catch((err) => { console.error(err); process.exitCode = 1; });
