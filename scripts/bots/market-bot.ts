#!/usr/bin/env node
/**
 * Market Data Bot — Real-time quotes, market snapshot, market indexes.
 *
 * CLI usage:
 *   node scripts/bots/market-bot.mjs snapshot          # latest market snapshot
 *   node scripts/bots/market-bot.mjs quotes 2330|2317   # real-time quotes for multiple stocks
 *   node scripts/bots/market-bot.mjs indexes            # TWSE + TPEx + TAIFEX indexes
 *   node scripts/bots/market-bot.mjs help               # usage info
 */

// 型別定義
interface StockQuote {
  code: string;
  close: number;
  change: number;
  changePct: number;
  volume: number;
}

interface MarketIndexData {
  twse?: any;
  tpex?: any;
  taifex?: any;
}

interface MarketSnapshotResponse {
  ok: boolean;
  quotes?: StockQuote[];
}

interface RealtimeQuotesResponse {
  ok: boolean;
  msgArray?: any[];
}

interface IndexesResponse {
  ok: boolean;
  twse?: any;
  tpex?: any;
  taifex?: any;
}

const LOCAL_BASE = process.env.TWETQ_LOCAL_URL
  ? new URL(process.env.TWETQ_LOCAL_URL.endsWith('/') 
    ? process.env.TWETQ_LOCAL_URL 
    : `${process.env.TWETQ_LOCAL_URL}/`).href
  : 'http://127.0.0.1:8787/';

const ENDPOINTS = {
  snapshot: '/api/market/snapshot',
  quotes:   '/api/realtime-quotes',
  indexes:  '/api/market/indexes',
};

async function fetchJson<T>(pathname: string, signal?: AbortSignal): Promise<T> {
  const url = new URL(pathname, LOCAL_BASE);
  const res = await fetch(url.href, { 
    signal: signal || AbortSignal.timeout(30_000) 
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${pathname}`);
  return res.json();
}

async function cmdSnapshot() {
  try {
    const data: MarketSnapshotResponse = await fetchJson(ENDPOINTS.snapshot);
    if (!data.ok || !data.quotes || !data.quotes.length) {
      console.log('No snapshot data available.');
      return;
    }
    console.log(`Market Snapshot — ${data.quotes.length} stocks\n`);
    // Sort by volume descending
    const sorted = [...data.quotes].sort((a, b) => (b.volume || 0) - (a.volume || 0)).slice(0, 50);
    console.log(
      sorted
        .map(
          (s) =>
            `${s.code.padEnd(6)} ${String(s.close).padEnd(8)}  ${s.change >= 0 ? '+' : ''}${s.change.toFixed(2)} (${s.changePct >= 0 ? '+' : ''}${s.changePct.toFixed(2)}%)  Vol: ${(s.volume / 1000).toFixed(0)}K`
        )
        .join('\n')
    );
    if (data.quotes.length > 50) {
      console.log(`\n(... ${data.quotes.length - 50} more stocks ...)`);
    }
  } catch (error) {
    console.error('Failed to fetch market snapshot:', error);
  }
}

async function cmdQuotes(channels: string) {
  if (!channels) {
    console.log('Usage: market-bot quotes <code1|code2|...>');
    console.log('Example: market-bot quotes 2330|2317|2880');
    return;
  }
  
  try {
    const data: RealtimeQuotesResponse = await fetchJson(`${ENDPOINTS.quotes}?channels=${encodeURIComponent(channels)}`);
    if (!data.msgArray || !data.msgArray.length) {
      console.log('No real-time quote data available.');
      return;
    }
    console.log(`Real-time Quotes: ${channels}\n`);
    console.log(
      data.msgArray
        .map((q) => `${q.ch.padEnd(6)} ${q.cx.padEnd(8)}  ${q.cn} (${q.cxn})  ${q.cxp}%  Open: ${q.co}`)
        .join('\n')
    );
  } catch (error) {
    console.error('Failed to fetch real-time quotes:', error);
  }
}

async function cmdIndexes() {
  try {
    const data: IndexesResponse = await fetchJson(ENDPOINTS.indexes);
    if (!data.ok) {
      console.log('Failed to fetch market indexes.');
      return;
    }
    console.log('Market Indexes\n');
    if (data.twse && data.twse.data && data.twse.data.length) {
      const twse = data.twse.data[0];
      console.log(`TWSE: ${twse.close}  Change: ${twse.changePrice} (${twse.changeRate}%)  Date: ${twse.tradeDate}`);
    } else {
      console.log('TWSE: No data');
    }
    if (data.tpex && data.tpex.data && data.tpex.data.length) {
      const tpex = data.tpex.data[0];
      console.log(`TPEx: ${tpex.close}  Change: ${tpex.changePrice} (${tpex.changeRate}%)  Date: ${tpex.tradeDate}`);
    } else {
      console.log('TPEx: No data');
    }
    if (data.taifex && data.taifex.data && data.taifex.data.length) {
      const taifex = data.taifex.data[0];
      console.log(`TAIFEX: ${taifex.close}  Change: ${taifex.changePrice} (${taifex.changeRate}%)  Date: ${taifex.tradeDate}`);
    } else {
      console.log('TAIFEX: No data');
    }
  } catch (error) {
    console.error('Failed to fetch market indexes:', error);
  }
}

async function cmdHelp() {
  console.log(`TWETQ Market Data Bot
====================

Commands:
  snapshot              Show latest market snapshot (top 50 by volume)
  quotes <codes>        Real-time quotes, pipe-separated codes (e.g. 2330|2317|2312)
  indexes               Show TWSE / TPEx / TAIFEX indexes
  help                  Show this help

Environment:
  TWETQ_LOCAL_URL       Override local server URL (default: http://127.0.0.1:8787)
`);
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length || args.includes('help') || args.includes('--help') || args.includes('-h')) {
    return cmdHelp();
  }
  const botName = args[0].toLowerCase();
  const cmd = args[0].toLowerCase();
  
  switch (cmd) {
    case 'snapshot':   
      await cmdSnapshot();  
      break;
    case 'quotes':     
      await cmdQuotes(args.slice(1).join('|'));  
      break;
    case 'indexes':    
      await cmdIndexes();  
      break;
    case 'help':
      await cmdHelp();
      break;
    default:
      console.error(`Unknown command: ${cmd}`);
      console.log('Available commands:', Object.keys({ snapshot: '', quotes: '', indexes: '', help: '' }).join(', '));
      console.log('Run "market-bot help" for usage.');
      process.exitCode = 1;
  }
}

// 當直接執行此腳本時運行主函數
if (require.main === module) {
  main().catch((error) => {
    console.error('Error running market bot:', error);
    process.exit(1);
  });
}

export { main, cmdSnapshot, cmdQuotes, cmdIndexes, cmdHelp };