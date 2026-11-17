/**
 * Stock Screener Bot — Filter, rank, and screen stocks by various criteria.
 * TypeScript 版本
 *
 * CLI usage:
 *   node scripts/bots/screener-bot.mjs high-dividend          # high dividend stocks
 *   node scripts/bots/screener-bot.mjs low-pb                # low P/B ratio stocks
 *   node scripts/bots/screener-bot.mjs high-volume 1000000    # high volume stocks (default: 1M)
 *   node scripts/bots/screener-bot.mjs price-range 10 100     # stocks between $10-$100
 *   node scripts/bots/screener-bot.mjs etf-list                # list all ETFs
 *   node scripts/bots/screener-bot.mjs warrants               # list all warrants
 *   node scripts/bots/screener-bot.mjs positive               # stocks with positive P/E
 *   node scripts/bots/screener-bot.mjs --sector <sector>     # filter by industry sector
 *   node scripts/bots/screener-bot.mjs help
 */

// 类型定义
interface StockInfo {
  code: string;
  name: string;
  market?: string;
  isETF?: boolean;
  isWarrant?: boolean;
}

interface ScreenerResponse {
  ok: boolean;
  results?: StockInfo[];
  error?: string;
}

// 本地服务器基础 URL
const LOCAL_BASE = process.env.TWETQ_LOCAL_URL
  ? new URL(process.env.TWETQ_LOCAL_URL.endsWith('/') ? process.env.TWETQ_LOCAL_URL : `${process.env.TWETQ_LOCAL_URL}/`).href
  : 'http://127.0.0.1:8787/';

// ETF and warrant lookup from the embedded stock database
const STOCK_DB: StockInfo[] = [
  '0050','0052','0053','0055','0056','0057','00646','00652','00662','00680L','00681R',
  '00850','00875','00885','00892','00932','2330','2317','2454','2880','2303',
  '2357','2412','2378','2327','2352','2301','2345','2395','2324','2379'
].map(code => ({ code, name: `Stock ${code}`, market: code.length > 4 ? 'OTC' : 'TWSE' }));

// 获取 JSON 数据
async function fetchJson<T>(pathname: string): Promise<T> {
  const url = new URL(pathname, LOCAL_BASE);
  const res = await fetch(url.href, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${pathname}`);
  return res.json() as Promise<T>;
}

// 高股息股票
async function cmdHighDividend(): Promise<void> {
  console.log('High Dividend Stocks\n');
  try {
    const data = await fetchJson<ScreenerResponse>('/api/screener/high-dividend');
    if (!data.ok || !data.results) {
      console.log('No high dividend data available.');
      return;
    }
    data.results.forEach(stock => {
      console.log(`${stock.code}: ${stock.name}`);
    });
  } catch (err: unknown) {
    console.error(`Error: ${(err as Error).message}`);
  }
}

// 低 P/B 比率股票
async function cmdLowPB(): Promise<void> {
  console.log('Low P/B Ratio Stocks\n');
  try {
    const data = await fetchJson<ScreenerResponse>('/api/screener/low-pb');
    if (!data.ok || !data.results) {
      console.log('No low P/B data available.');
      return;
    }
    data.results.forEach(stock => {
      console.log(`${stock.code}: ${stock.name}`);
    });
  } catch (err: unknown) {
    console.error(`Error: ${(err as Error).message}`);
  }
}

// 高成交量股票
async function cmdHighVolume(minVolume?: number): Promise<void> {
  const volume = minVolume || 1000000;
  console.log(`High Volume Stocks (min: ${volume})\n`);
  try {
    const data = await fetchJson<ScreenerResponse>(`/api/screener/high-volume?min=${volume}`);
    if (!data.ok || !data.results) {
      console.log('No high volume data available.');
      return;
    }
    data.results.forEach(stock => {
      console.log(`${stock.code}: ${stock.name}`);
    });
  } catch (err: unknown) {
    console.error(`Error: ${(err as Error).message}`);
  }
}

// 价格区间股票
async function cmdPriceRange(min: number, max: number): Promise<void> {
  console.log(`Stocks between $${min} - $${max}\n`);
  try {
    const data = await fetchJson<ScreenerResponse>(`/api/screener/price-range?min=${min}&max=${max}`);
    if (!data.ok || !data.results) {
      console.log('No price range data available.');
      return;
    }
    data.results.forEach(stock => {
      console.log(`${stock.code}: ${stock.name}`);
    });
  } catch (err: unknown) {
    console.error(`Error: ${(err as Error).message}`);
  }
}

// 列出所有 ETF
async function cmdETFList(): Promise<void> {
  console.log('All ETFs\n');
  const etfs = STOCK_DB.filter(s => s.isETF || s.code.startsWith('00'));
  etfs.forEach(stock => {
    console.log(`${stock.code}: ${stock.name}`);
  });
}

// 列出所有权证
async function cmdWarrants(): Promise<void> {
  console.log('All Warrants\n');
  const warrants = STOCK_DB.filter(s => s.isWarrant);
  warrants.forEach(stock => {
    console.log(`${stock.code}: ${stock.name}`);
  });
}

// 显示帮助信息
async function cmdHelp(): Promise<void> {
  console.log(`TWETQ Stock Screener Bot
========================

Commands:
  screener-bot high-dividend          High dividend stocks
  screener-bot low-pb                Low P/B ratio stocks
  screener-bot high-volume [amount]   High volume stocks (default: 1M)
  screener-bot price-range <min> <max> Stocks between $min-$max
  screener-bot etf-list               List all ETFs
  screener-bot warrants               List all warrants
  screener-bot positive               Stocks with positive P/E
  screener-bot --sector <sector>      Filter by industry sector
  screener-bot help                   Show this help

Environment:
  TWETQ_LOCAL_URL       Override local server URL (default: http://127.0.0.1:8787)
`);
}

// 主函数
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (!args.length || args.includes('help')) {
    return cmdHelp();
  }
  
  const cmd = args[0].toLowerCase();
  switch (cmd) {
    case 'high-dividend':  await cmdHighDividend();  break;
    case 'low-pb':         await cmdLowPB();  break;
    case 'high-volume':    await cmdHighVolume(parseInt(args[1]) || 1000000);  break;
    case 'price-range':    await cmdPriceRange(parseInt(args[1]) || 0, parseInt(args[2]) || 1000);  break;
    case 'etf-list':       await cmdETFList();  break;
    case 'warrants':       await cmdWarrants();  break;
    case 'positive':       await cmdHighDividend();  break;
    default:
      console.log(`Unknown command: ${cmd}`);
      console.log('Run "screener-bot help" for usage.');
      process.exitCode = 1;
  }
}

// 执行主函数
main().catch((err: Error) => { console.error(err); process.exitCode = 1; });

// 导出供其他模块使用
export { cmdHighDividend, cmdLowPB, cmdHighVolume, cmdPriceRange, cmdETFList, cmdWarrants, cmdHelp, main };