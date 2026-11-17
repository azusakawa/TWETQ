/**
 * Financial Data Bot — MOPS financial statements, balance sheet, income statement.
 *
 * CLI usage:
 *   node scripts/bots/financial-bot.mjs 2330           # get MOPS financials for TSMC
 *   node scripts/bots/financial-bot.mjs 2330 --list    # list all financial endpoints
 *   node scripts/bots/financial-bot.mjs 2330 balance   # balance sheet only
 *   node scripts/bots/financial-bot.mjs 2330 income    # income statement only
 *   node scripts/bots/financial-bot.mjs 2330 cashflow  # cash flow statement
 *   node scripts/bots/financial-bot.mjs --batch listed # batch: all listed company financials (t187ap03/t187ap06/t187ap07)
 *   node scripts/bots/financial-bot.mjs --batch otc    # batch: all OTC company financials
 *   node scripts/bots/financial-bot.mjs --top 20       # top 20 companies by revenue
 *   node scripts/bots/financial-bot.mjs help
 */

const LOCAL_BASE = process.env.TWETQ_LOCAL_URL
  ? new URL(process.env.TWETQ_LOCAL_URL.endsWith('/') ? process.env.TWETQ_LOCAL_URL : `${process.env.TWETQ_LOCAL_URL}/`).href
  : 'http://127.0.0.1:8787/';

async function fetchJson(pathname, signal) {
  const url = new URL(pathname, LOCAL_BASE);
  const res = await fetch(url.href, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${pathname}`);
  return res.json();
}

// Single stock financials — hits /api/mops-financials?code=XXX
async function cmdSingleStock(code, statementType) {
  if (!code) {
    console.log('Usage: financial-bot <stock-code> [--list | balance|income|cashflow]');
    return;
  }
  console.log(`MOPS Financials for ${code}\n`);
  try {
    const data = await fetchJson(`/api/mops-financials?code=${encodeURIComponent(code)}`);
    if (!data.ok) {
      console.error(data.error || 'Failed to fetch financial data.');
      return;
    }
    // Display the financial data
    if (statementType && statementType !== 'all') {
      const key = `t187ap${statementType === 'balance' ? '06' : statementType === 'income' ? '07' : '03'}`;
      const result = data.data?.find(d => d.endpoint === key);
      if (result?.data && Array.isArray(result.data) && result.data.length) {
        const headers = Object.keys(result.data[0]);
        console.log(headers.join('\t'));
        result.data.slice(0, 10).forEach(row => {
          console.log(headers.map(h => row[h] ?? '').join('\t'));
        });
        if (result.data.length > 10) console.log(`\n(... ${result.data.length - 10} more rows ...)`);
      } else {
        console.log('No data for this statement type.');
      }
    } else {
      // Show all available financial types
      if (Array.isArray(data.data)) {
        for (const ep of data.data) {
          console.log(`\n--- ${ep.endpoint} (${ep.data?.length || 0} rows) ---`);
          if (ep.data && ep.data.length) {
            const headers = Object.keys(ep.data[0]).slice(0, 12);
            console.log(headers.join('\t'));
            ep.data.slice(0, 5).forEach(row => {
              console.log(headers.map(h => row[h] ?? '').join('\t'));
            });
            if (ep.data.length > 5) console.log(`\n(... ${ep.data.length - 5} more rows ...)`);
          }
        }
      }
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}

// Batch financials — hits /api/mops-batch-financials?market=listed|otc
async function cmdBatch(market, topN) {
  console.log(`MOPS Batch Financials — Market: ${market || 'all'}\n`);
  try {
    const url = `/api/mops-batch-financials?market=${encodeURIComponent(market || 'listed')}`;
    const data = await fetchJson(url);
    if (!data.ok || !data.data?.length) {
      console.log('No batch financial data available.');
      return;
    }
    // Extract all unique stock codes from all endpoints
    const allStocks = new Map();
    for (const ep of data.data) {
      if (!ep.data || !Array.isArray(ep.data)) continue;
      for (const row of ep.data) {
        const code = row.cotno2 || row.stockNo || row.stock_code;
        if (code && !allStocks.has(code)) {
          allStocks.set(code, { code, name: row.cotname || row.stockName || row.stock_name || '', data: {}, eps: 0, revenue: 0 });
        }
        const stock = allStocks.get(code);
        if (row.eps) stock.eps = parseFloat(row.eps) || 0;
        if (row.revenue) stock.revenue = parseFloat(row.revenue) || 0;
        if (row.cotname || row.stockName || row.stock_name) stock.name = row[Object.keys(row).find(k => k.includes('name') || k.includes('Name'))] || stock.name;
      }
    }
    // Sort by revenue descending, show top N
    const sorted = [...allStocks.values()].sort((a, b) => b.revenue - a.revenue);
    const limit = topN || Math.min(50, sorted.length);
    console.log(`Top ${limit} companies by revenue (${market || 'listed'}):\n`);
    console.log(`${'Code'.padEnd(6)}  ${'Name'.padEnd(20)}  ${'Revenue'.padEnd(12)}  ${'EPS'.padEnd(8)}`);
    console.log('-'.repeat(50));
    sorted.slice(0, limit).forEach(s => {
      const revStr = s.revenue >= 1e9
        ? (s.revenue / 1e9).toFixed(1) + 'B'
        : s.revenue >= 1e6
          ? (s.revenue / 1e6).toFixed(1) + 'M'
          : s.revenue.toString();
      console.log(`${s.code.padEnd(6)}  ${s.name.substring(0, 18).padEnd(20)}  ${revStr.padEnd(12)}  ${s.eps.toFixed(2).padEnd(8)}`);
    });
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}

async function cmdHelp() {
  console.log(`TWETQ Financial Data Bot
=======================

Single Stock Commands:
  financial-bot <code>            Get all MOPS financial statements
  financial-bot <code> balance    Balance sheet (t187ap06)
  financial-bot <code> income     Income statement (t187ap07)
  financial-bot <code> cashflow   Cash flow statement (t187ap03)
  financial-bot <code> --list     List all available financial endpoints

Batch Commands:
  financial-bot --batch listed    All listed company financials
  financial-bot --batch otc       All OTC company financials
  financial-bot --batch listed --top 20  Top 20 companies by revenue
  financial-bot --batch otc --top 10   Top 10 OTC companies by revenue

Environment:
  TWETQ_LOCAL_URL       Override local server URL (default: http://127.0.0.1:8787)
`);
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length || args.includes('help')) {
    return cmdHelp();
  }
  const stockCode = args[0];
  const statementType = ['balance', 'income', 'cashflow'].find(t => args.includes(t)) || null;
  const batchMarket = args.includes('--batch') ? (args[args.indexOf('--batch') + 1] || 'listed') : null;
  const topN = parseInt(args[args.indexOf('--top') + 1]) || (args.includes('--top') ? 50 : null);

  if (batchMarket) {
    return cmdBatch(batchMarket, topN);
  }
  return cmdSingleStock(stockCode, statementType);
}

main().catch((err) => { console.error(err); process.exitCode = 1; });
