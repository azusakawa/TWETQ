/**
 * Stock Screener Bot — Filter, rank, and screen stocks by various criteria.
 *
 * CLI usage:
 *   node scripts/bots/screener-bot.mjs high-dividend          # high dividend stocks
 *   node scripts/bots/screener-bot.mjs low-pb                # low P/B ratio stocks
 *   node scripts/bots/screener-bot.mjs high-volume 1000000    # high volume stocks (default: 1M)
 *   node scripts/bots/screener-bot.mjs price-range 10 100     # stocks between $10-$100
 *   node scripts/bots/screener-bot.mjs etf-list                # list all ETFs
 *   node scripts/bots/screener-bot.mjs warrants               # list all warrants
 *   node scripts/bots/screener-bot.mjs positive               # stocks with positive P/E
 *   node scripts/bots/screener-bot.mjs --sector 半導體         # filter by industry sector
 *   node scripts/bots/screener-bot.mjs help
 */

const LOCAL_BASE = process.env.TWETQ_LOCAL_URL
  ? new URL(process.env.TWETQ_LOCAL_URL.endsWith('/') ? process.env.TWETQ_LOCAL_URL : `${process.env.TWETQ_LOCAL_URL}/`).href
  : 'http://127.0.0.1:8787/';

// ETF and warrant lookup from the embedded stock database
const STOCK_DB = await (async () => {
  try {
    const res = await fetch(new URL('/data/stock-db.json', LOCAL_BASE).href, { signal: AbortSignal.timeout(5000) });
    if (res.ok) return await res.json();
  } catch {}
  // Fallback: use embedded database from app.js (common stock codes)
  const builtinCodes = new Set([
    '0050','0052','0053','0055','0056','0057','00646','00652','00662','00680L','00681R',
    '00850','00875','00885','00892','00932','2330','2317','2454','2880','2303',
    '2357','2412','2378','2327','2352','2301','2345','2395','2324','2379',
    '3008','3009','3017','3033','3045','3303','3355','3365','3378','3446',
    '4911','4917','4918','4919','4920','4922','4923','4925','4926','4927',
    '8046','8047','8048','8049','8050','8051','8052','8053','8054','8055',
  ]);
  const builtinNames = {
    '0050':'元大台灣50','0052':'富邦科技','0053':'元大電子','0055':'元大MSCI金融',
    '0056':'元大高股息','0057':'富邦摩台','00646':'元大S&P500','00652':'富邦印度',
    '00662':'富邦NASDAQ','00680L':'元大美債20正2','00681R':'元大美債20反1',
    '00850':'元大臺灣ESG永續','00875':'國泰網路資安','00885':'富邦越南',
    '00892':'富邦台灣半導體','00932':'兆豐永續高息等權','2330':'台積電','2317':'聯電',
    '2454':'鴻海','2880':'大立光','2303':'宏碁','2357':'群創',
    '2412':'奇力新','2378':'瑞昱','2327':'威盛','2352':'聯發科','2301':'資策會',
    '2345':'仁寶','2395':'華碩','2324':'廣宇','2379':'創意',
    '3008':'聯發科特','3009':'智邦','3017':'緯創','3033':'雙信電',
    '3045':'神基','3303':'聯發科指數','3355':'群創指數','3365':'璨宇',
    '3378':'奇景','3446':'南電',
    '4911':'中華電信','4917':'台灣大哥大','4918':'遠傳','4919':'台灣之星',
    '4920':'台灣寬頻','4922':'亞太電信','4923':'全訊通信','4925':'台灣寬頻4G',
    '4926':'台灣大行動','4927':'台灣寬頻WiFi',
    '8046':'統一超','8047':'7-11','8048':'全家','8049':'萊爾富','8050':'Okie',
    '8051':'全家便利','8052':'7-11控股','8053':'全家持股','8054':'萊爾富持股','8055':'統一麵包',
  };
  const db = [];
  builtinCodes.forEach(code => {
    const isEtf = code.startsWith('00') || code.startsWith('01') || code.startsWith('02');
    db.push({ code, name: builtinNames[code] || '', market: 'listed', isEtf, isWarrant: false });
  });
  return db;
})();

async function fetchSnapshot() {
  try {
    const res = await fetch(new URL('/api/market/snapshot', LOCAL_BASE).href, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.quotes || []).map(q => ({
      ...q, code: q.code, market: q.market || 'listed',
      close: parseFloat(q.close) || 0, changePct: parseFloat(q.changePct) || 0,
      volume: parseInt(q.volume) || 0, value: parseFloat(q.value) || 0,
    }));
  } catch { return []; }
}

async function fetchPerRatio() {
  try {
    const res = await fetch(new URL('/data/tpex/tpex_mainboard_peratio_analysis.json', LOCAL_BASE).href, { signal: AbortSignal.timeout(30_000) });
    if (res.ok) return await res.json();
  } catch {}
  // Fallback for listed
  try {
    const res = await fetch(new URL('/data/mops-batch/mopsfin_t187ap03_L.json', LOCAL_BASE).href, { signal: AbortSignal.timeout(30_000) });
    if (res.ok) return await res.json();
  } catch {}
  return [];
}

async function cmdHighDividend() {
  console.log('High Dividend Stocks (P/E < 20, positive EPS)\n');
  const [snapshot, perRatio] = await Promise.all([fetchSnapshot(), fetchPerRatio()]);
  const ratioMap = new Map();
  (Array.isArray(perRatio) ? perRatio : []).forEach(r => {
    const code = r.cotno2 || r.stockNo || r.code;
    if (code && r.peratio) ratioMap.set(code, parseFloat(r.peratio) || 999);
  });
  const filtered = snapshot
    .filter(q => {
      const pe = ratioMap.get(q.code);
      return pe && pe > 0 && pe < 20 && q.close > 0;
    })
    .map(q => ({ ...q, pe: ratioMap.get(q.code) || 0 }))
    .sort((a, b) => a.pe - b.pe)
    .slice(0, 50);
  console.log(`${'Code'.padEnd(6)}  ${'Close'.padEnd(8)}  ${'P/E'.padEnd(8)}  ${'Change%'.padEnd(10)}  ${'Volume'.padEnd(12)}`);
  console.log('-'.repeat(48));
  filtered.forEach(q => {
    console.log(
      `${q.code.padEnd(6)}  ${q.close.toFixed(2).padEnd(8)}  ${(q.pe || 0).toFixed(2).padEnd(8)}  ${(q.changePct >= 0 ? '+' : '') + q.changePct.toFixed(2).padEnd(10)} ${(q.volume / 1000).toFixed(0) + 'K'}`
    );
  });
  if (!filtered.length) console.log('No high dividend stocks found with current data.');
}

async function cmdLowPB() {
  console.log('Low P/B Ratio Stocks (P/B < 1.5)\n');
  const snapshot = await fetchSnapshot();
  // Use MOPS financial data to find low P/B
  try {
    const [t187ap03, t187ap06] = await Promise.all([
      fetch(new URL('/data/mops-batch/mopsfin_t187ap03_L.json', LOCAL_BASE).href, { signal: AbortSignal.timeout(30_000) }).then(r => r.json()).catch(() => []),
      fetch(new URL('/data/mops-batch/mopsfin_t187ap06_L.json', LOCAL_BASE).href, { signal: AbortSignal.timeout(30_000) }).then(r => r.json()).catch(() => []),
    ]);
    const pbMap = new Map();
    (Array.isArray(t187ap06) ? t187ap06 : []).forEach(r => {
      const code = r.cotno2 || r.stockNo || r.code;
      if (code && r.pbv) pbMap.set(code, parseFloat(r.pbv) || 999);
    });
    const filtered = snapshot
      .filter(q => {
        const pb = pbMap.get(q.code);
        return pb && pb > 0 && pb < 1.5;
      })
      .sort((a, b) => (pbMap.get(a.code) || 0) - (pbMap.get(b.code) || 0))
      .slice(0, 50);
    console.log(`${'Code'.padEnd(6)}  ${'Close'.padEnd(8)}  ${'P/B'.padEnd(8)}  ${'Change%'.padEnd(10)}  ${'Volume'.padEnd(12)}`);
    console.log('-'.repeat(48));
    filtered.forEach(q => {
      console.log(
        `${q.code.padEnd(6)}  ${q.close.toFixed(2).padEnd(8)} ${(pbMap.get(q.code) || 0).toFixed(2).padEnd(8)} ${(q.changePct >= 0 ? '+' : '') + q.changePct.toFixed(2).padEnd(10)} ${(q.volume / 1000).toFixed(0) + 'K'}`
      );
    });
  } catch (err) {
    console.log('Could not fetch P/B data from local files.');
  }
}

async function cmdHighVolume(minVolume) {
  const threshold = parseFloat(minVolume) || 1e6; // default 1M
  console.log(`High Volume Stocks (vol > ${(threshold / 1000).toFixed(0)}K)\n`);
  const snapshot = await fetchSnapshot();
  const filtered = snapshot
    .filter(q => q.volume > threshold)
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 50);
  console.log(`${'Code'.padEnd(6)}  ${'Close'.padEnd(8)}  ${'Volume'.padEnd(12)}  ${'Value'.padEnd(14)}  ${'Change%'.padEnd(10)}`);
  console.log('-'.repeat(56));
  filtered.forEach(q => {
    console.log(
      `${q.code.padEnd(6)}  ${q.close.toFixed(2).padEnd(8)} ${(q.volume / 1000).toFixed(0) + 'K'.padEnd(12)} ${(q.value >= 1e8 ? (q.value / 1e8).toFixed(2) + 'B' : (q.value / 1e4).toFixed(1) + 'K').padEnd(14)} ${(q.changePct >= 0 ? '+' : '') + q.changePct.toFixed(2).padEnd(10)}`
    );
  });
}

async function cmdPriceRange(min, max) {
  const minP = parseFloat(min) || 0;
  const maxP = parseFloat(max) || 99999;
  console.log(`Price Range: $${minP} - $${maxP}\n`);
  const snapshot = await fetchSnapshot();
  const filtered = snapshot
    .filter(q => q.close >= minP && q.close <= maxP)
    .sort((a, b) => a.close - b.close)
    .slice(0, 50);
  console.log(`${'Code'.padEnd(6)}  ${'Close'.padEnd(8)}  ${'Change%'.padEnd(10)}  ${'Volume'.padEnd(12)}`);
  console.log('-'.repeat(40));
  filtered.forEach(q => {
    console.log(
      `${q.code.padEnd(6)}  ${q.close.toFixed(2).padEnd(8)} ${(q.changePct >= 0 ? '+' : '') + q.changePct.toFixed(2).padEnd(10)} ${(q.volume / 1000).toFixed(0) + 'K'}`
    );
  });
}

async function cmdEtfList() {
  console.log('ETF List (from embedded database)\n');
  const all = await STOCK_DB;
  const etfs = all.filter(s => s.isEtf);
  console.log(`${'Code'.padEnd(10)}  ${'Name'.padEnd(24)}  ${'Type'}`);
  console.log('-'.repeat(38));
  etfs.slice(0, 100).forEach(e => {
    console.log(`${e.code.padEnd(10)}  ${e.name.substring(0, 22).padEnd(24)} ${e.market}`);
  });
  console.log(`\nTotal ETFs: ${etfs.length}`);
}

async function cmdWarrants() {
  console.log('Warrants (positive/negative leverage)\n');
  const all = await STOCK_DB;
  const warrants = all.filter(s => s.code.includes('L') || s.code.includes('R'));
  console.log(`${'Code'.padEnd(10)}  ${'Name'.padEnd(24)}  ${'Leverage Type'}`);
  console.log('-'.repeat(38));
  warrants.forEach(w => {
    const type = w.code.includes('L') ? '正2' : w.code.includes('R') ? '反1' : '—';
    console.log(`${w.code.padEnd(10)}  ${w.name.substring(0, 22).padEnd(24)} ${type}`);
  });
  console.log(`\nTotal Warrants: ${warrants.length}`);
}

async function cmdPositive() {
  console.log('Stocks with Positive Performance (Positive P/E & Positive Change)\n');
  const [snapshot, perRatio] = await Promise.all([fetchSnapshot(), fetchPerRatio()]);
  const ratioMap = new Map();
  (Array.isArray(perRatio) ? perRatio : []).forEach(r => {
    const code = r.cotno2 || r.stockNo || r.code;
    if (code && r.peratio) ratioMap.set(code, parseFloat(r.peratio) || 0);
  });
  const filtered = snapshot
    .filter(q => {
      const pe = ratioMap.get(q.code);
      return pe && pe > 0 && q.changePct > 0;
    })
    .map(q => ({ ...q, pe: ratioMap.get(q.code) || 0 }))
    .sort((a, b) => b.changePct - a.changePct)
    .slice(0, 50);
  console.log(`${'Code'.padEnd(6)}  ${'Close'.padEnd(8)}  ${'P/E'.padEnd(8)}  ${'Change%'.padEnd(10)}  ${'Volume'.padEnd(12)}`);
  console.log('-'.repeat(48));
  filtered.forEach(q => {
    console.log(
      `${q.code.padEnd(6)}  ${q.close.toFixed(2).padEnd(8)} ${(q.pe || 0).toFixed(2).padEnd(8)} ${(q.changePct >= 0 ? '+' : '') + q.changePct.toFixed(2).padEnd(10)} ${(q.volume / 1000).toFixed(0) + 'K'}`
    );
  });
}

async function cmdHelp() {
  console.log(`TWETQ Stock Screener Bot
========================

Commands:
  screener-bot high-dividend        Stocks with P/E < 20 (high dividend candidates)
  screener-bot low-pb               Stocks with P/B < 1.5 (value stocks)
  screener-bot high-volume 1000000  High volume stocks (default threshold: 1M)
  screener-bot price-range 10 100   Stocks priced between $10 and $100
  screener-bot etf-list             List all ETFs from embedded database
  screener-bot warrants             List positive/negative leverage warrants
  screener-bot positive             Stocks with positive P/E and positive change
  screener-bot --sector 半導體      Filter by industry sector (future)

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
  const sectorIdx = args.indexOf('--sector');
  if (sectorIdx >= 0) {
    console.log('Sector filtering requires server-side implementation. Coming soon.');
    return;
  }
  switch (cmd) {
    case 'high-dividend':  return cmdHighDividend();
    case 'low-pb':        return cmdLowPB();
    case 'high-volume':   return cmdHighVolume(args[1] ? parseFloat(args[1]) : 1e6);
    case 'price-range':   return cmdPriceRange(args[1], args[2]);
    case 'etf-list':      return cmdEtfList();
    case 'warrants':      return cmdWarrants();
    case 'positive':      return cmdPositive();
    default:
      console.error(`Unknown command: ${cmd}`);
      console.log('Run "screener-bot help" for usage.');
      process.exitCode = 1;
  }
}

main().catch((err) => { console.error(err); process.exitCode = 1; });
