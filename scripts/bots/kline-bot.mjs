/**
 * K-line (Candlestick) Bot — Historical price data, chart analysis.
 *
 * CLI usage:
 *   node scripts/bots/kline-bot.mjs 2330                # 1-year K-line for TSMC
 *   node scripts/bots/kline-bot.mjs 2330 --months 24    # 2-year K-line
 *   node scripts/bots/kline-bot.mjs 2330 --daily 100    # last 100 trading days
 *   node scripts/bots/kline-bot.mjs --compare 2330 2880 # compare TSMC vs ASE
 *   node scripts/bots/kline-bot.mjs --volume 2330       # volume analysis
 *   node scripts/bots/kline-bot.mjs help
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

// Get historical K-line data from TWSE/TPEx OpenAPI
async function fetchKlineData(code, months, isOtc) {
  const baseUrl = isOtc
    ? 'https://www.tpex.org.tw/openapi/v1'
    : 'https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY';
  const url = `${baseUrl}?stockNo=${code}&start=${formatDate(new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000))}&end=${formatDate(new Date())}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${code}`);
  const data = await res.json();
  return (Array.isArray(data) ? data : []).map(row => ({
    date: row.date || row.tradeDate || '',
    open: parseFloat(row.open) || 0,
    high: parseFloat(row.high) || 0,
    low: parseFloat(row.low) || 0,
    close: parseFloat(row.close) || 0,
    volume: parseInt(row.volume || row.volumeTrade) || 0,
    value: parseFloat(row.value || row.tradingValue) || 0,
    transactions: parseInt(row.transactions || row.transactionsCount) || 0,
  }));
}

function formatDate(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

function isOtc(code) {
  return code.length > 4 || ['4300','4301','4302','4303','4304','4305','4306','4307','4308','4309','4310','4311','4312','4313','4314','4315','4316','4317','4318','4319','4320','4321','4322','4323','4324','4325','4326','4327','4328','4329','4330','4331','4332','4333','4334','4335','4336','4337','4338','4339','4340','4341','4342','4343','4344','4345','4346','4347','4348','4349','4350'].includes(code);
}

async function cmdSingleKline(code, months, maxDays) {
  console.log(`K-line: ${code} (${months || 12} months)\n`);
  try {
    const otc = isOtc(code);
    const data = await fetchKlineData(code, months || 12, otc);
    if (!data.length) {
      console.log(`No K-line data available for ${code}.`);
      return;
    }
    const displayData = maxDays ? data.slice(-maxDays) : data;
    console.log(`Total records: ${data.length}, Showing: ${displayData.length}\n`);
    console.log(`${'Date'.padEnd(12)}  ${'Open'.padEnd(8)}  ${'High'.padEnd(8)}  ${'Low'.padEnd(8)}  ${'Close'.padEnd(8)}  ${'Volume'.padEnd(14)}  ${'Change%'.padEnd(10)}`);
    console.log('-'.repeat(72));
    displayData.forEach(d => {
      const changePct = d.open > 0 ? ((d.close - d.open) / d.open * 100) : 0;
      console.log(
        `${d.date.padEnd(12)}  ${d.open.toFixed(2).padEnd(8)}  ${d.high.toFixed(2).padEnd(8)}  ${d.low.toFixed(2).padEnd(8)}  ${d.close.toFixed(2).padEnd(8)} ${(d.volume / 1000).toFixed(0) + 'K'.padEnd(14)} ${(changePct >= 0 ? '+' : '') + changePct.toFixed(2).padEnd(10)}`
      );
    });
    // Summary stats
    if (displayData.length) {
      const closes = displayData.map(d => d.close);
      const volumes = displayData.map(d => d.volume);
      const maxClose = Math.max(...closes);
      const minClose = Math.min(...closes);
      const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
      const lastClose = closes[closes.length - 1];
      const firstClose = closes[0];
      const totalReturn = ((lastClose - firstClose) / firstClose * 100).toFixed(2);
      console.log('\n--- Summary ---');
      console.log(`Period: ${displayData[0].date} → ${displayData[displayData.length - 1].date}`);
      console.log(`Range: ${minClose.toFixed(2)} — ${maxClose.toFixed(2)}`);
      console.log(`Last Close: ${lastClose.toFixed(2)}`);
      console.log(`Total Return: ${totalReturn}%`);
      console.log(`Avg Volume: ${(avgVolume / 1000).toFixed(0)}K`);
    }
  } catch (err) {
    console.error(`Error fetching ${code}: ${err.message}`);
    console.log('Tip: Ensure the stock code is correct (e.g., 2330 for TSMC).');
  }
}

async function cmdCompare(code1, code2) {
  console.log(`K-line Comparison: ${code1} vs ${code2}\n`);
  try {
    const [data1, data2] = await Promise.all([
      fetchKlineData(code1, 12, isOtc(code1)),
      fetchKlineData(code2, 12, isOtc(code2)),
    ]);
    console.log(`\n${code1} (${data1.length} days)`);
    if (data1.length) {
      const last1 = data1[data1.length - 1];
      const first1 = data1[0];
      const ret1 = ((last1.close - first1.close) / first1.close * 100).toFixed(2);
      console.log(`  Price: ${first1.close.toFixed(2)} → ${last1.close.toFixed(2)} (${ret1}%)`);
    }
    console.log(`\n${code2} (${data2.length} days)`);
    if (data2.length) {
      const last2 = data2[data2.length - 1];
      const first2 = data2[0];
      const ret2 = ((last2.close - first2.close) / first2.close * 100).toFixed(2);
      console.log(`  Price: ${first2.close.toFixed(2)} → ${last2.close.toFixed(2)} (${ret2}%)`);
    }
    console.log(`\nRelative Performance: ${(parseFloat(data2[data2.length-1]?.close || 0) / (data2.length ? parseFloat(data2[0].close) : 1) * 100 - parseFloat(data1[data1.length-1]?.close || 0) / (data1.length ? parseFloat(data1[0].close) : 1) * 100).toFixed(2)}%`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}

async function cmdVolumeAnalysis(code) {
  console.log(`Volume Analysis: ${code}\n`);
  try {
    const otc = isOtc(code);
    const data = await fetchKlineData(code, 6, otc);
    if (!data.length) {
      console.log(`No volume data available for ${code}.`);
      return;
    }
    const volumes = data.map(d => d.volume);
    const avgVol = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const maxVol = Math.max(...volumes);
    const recent10 = data.slice(-10).map(d => d.volume);
    const recentAvg = recent10.reduce((a, b) => a + b, 0) / recent10.length;
    console.log(`${'Date'.padEnd(12)}  ${'Close'.padEnd(8)}  ${'Volume'.padEnd(14)}  ${'vs Avg'}`);
    console.log('-'.repeat(46));
    data.slice(-30).forEach(d => {
      const vsAvg = d.volume / avgVol;
      const bar = '█'.repeat(Math.min(10, Math.floor(vsAvg * 5)));
      console.log(
        `${d.date.padEnd(12)}  ${d.close.toFixed(2).padEnd(8)} ${(d.volume / 1000).toFixed(0) + 'K'.padEnd(14)} ${bar} ${vsAvg.toFixed(2)}x`
      );
    });
    console.log('\n--- Volume Summary ---');
    console.log(`Avg Volume (6mo): ${(avgVol / 1000).toFixed(0)}K`);
    console.log(`Max Volume: ${(maxVol / 1000).toFixed(0)}K`);
    console.log(`Recent 10d Avg: ${(recentAvg / 1000).toFixed(0)}K`);
    console.log(`Volume Ratio (recent/avg): ${(recentAvg / avgVol).toFixed(2)}`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}

async function cmdHelp() {
  console.log(`TWETQ K-line Bot
================

Commands:
  kline-bot <code>                  12-month K-line (default)
  kline-bot <code> --months 24      24-month K-line
  kline-bot <code> --daily 100      Last 100 trading days
  kline-bot --compare 2330 2880     Compare two stocks
  kline-bot --volume 2330           Volume analysis for a stock
  kline-bot help

Notes:
  - Data sources: TWSE OpenAPI (listed), TPEx OpenAPI (OTC)
  - Code format: 4-digit (e.g., 2330 for TSMC), 6-digit with suffix (OTC)
  - Local mode: runs against local server (default: 127.0.0.1:8787)
  - Online mode: fetches directly from official APIs

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
  const monthsIdx = args.indexOf('--months');
  const months = monthsIdx >= 0 ? parseInt(args[monthsIdx + 1]) || 12 : 12;
  const dailyIdx = args.indexOf('--daily');
  const maxDays = dailyIdx >= 0 ? parseInt(args[dailyIdx + 1]) : null;
  const compareIdx = args.indexOf('--compare');
  const volumeIdx = args.indexOf('--volume');

  if (compareIdx >= 0 && args[compareIdx + 1] && args[compareIdx + 2]) {
    return cmdCompare(args[compareIdx + 1], args[compareIdx + 2]);
  }
  if (volumeIdx >= 0 && args[volumeIdx + 1]) {
    return cmdVolumeAnalysis(args[volumeIdx + 1]);
  }
  if (code) {
    return cmdSingleKline(code, months, maxDays);
  }
  console.error('No valid command found. Run "kline-bot help" for usage.');
  process.exitCode = 1;
}

main().catch((err) => { console.error(err); process.exitCode = 1; });
