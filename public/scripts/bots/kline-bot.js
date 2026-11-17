/**
 * K-line (Candlestick) Bot — Historical price data, chart analysis.
 * TypeScript 版本
 *
 * CLI usage:
 *   node scripts/bots/kline-bot.mjs 2330                # 1-year K-line for TSMC
 *   node scripts/bots/kline-bot.mjs 2330 --months 24    # 2-year K-line
 *   node scripts/bots/kline-bot.mjs 2330 --daily 100    # last 100 trading days
 *   node scripts/bots/kline-bot.mjs --compare 2330 2880 # compare TSMC vs ASE
 *   node scripts/bots/kline-bot.mjs --volume 2330       # volume analysis
 *   node scripts/bots/kline-bot.mjs help
 */
// 本地服务器基础 URL
const LOCAL_BASE = process.env.TWETQ_LOCAL_URL
    ? new URL(process.env.TWETQ_LOCAL_URL.endsWith('/') ? process.env.TWETQ_LOCAL_URL : `${process.env.TWETQ_LOCAL_URL}/`).href
    : 'http://127.0.0.1:8787/';
// 格式化日期
function formatDate(date) {
    return date.toISOString().split('T')[0];
}
// 获取 JSON 数据
async function fetchJson(pathname, signal) {
    const url = new URL(pathname, LOCAL_BASE);
    const res = await fetch(url.href, { signal: signal || AbortSignal.timeout(30_000) });
    if (!res.ok)
        throw new Error(`HTTP ${res.status} for ${pathname}`);
    return res.json();
}
// 获取历史 K 线数据
async function fetchKlineData(code, months, isOtc) {
    const baseUrl = isOtc
        ? 'https://www.tpex.org.tw/openapi/v1'
        : 'https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY';
    const url = `${baseUrl}?stockNo=${code}&start=${formatDate(new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000))}&end=${formatDate(new Date())}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok)
        throw new Error(`HTTP ${res.status} for ${url}`);
    const data = await res.json();
    return (data.data || []).map((row) => ({
        date: row[0],
        open: parseFloat(row[1]),
        high: parseFloat(row[2]),
        low: parseFloat(row[3]),
        close: parseFloat(row[4]),
        volume: parseInt(row[6])
    }));
}
// 获取单只股票 K 线数据
async function cmdSingleStock(code, months = 12) {
    console.log(`K-line for ${code} (${months} months)\n`);
    try {
        const isOtc = code.length > 4;
        const klines = await fetchKlineData(code, months, isOtc);
        console.log(`${klines.length} days of data\n`);
        console.log(`${'Date'.padEnd(12)}  ${'Open'.padEnd(8)}  ${'High'.padEnd(8)}  ${'Low'.padEnd(8)}  ${'Close'.padEnd(8)}  ${'Volume'.padEnd(12)}`);
        console.log('-'.repeat(60));
        klines.slice(-20).forEach(kline => {
            console.log(`${kline.date.padEnd(12)}  ${kline.open.toFixed(2).padEnd(8)}  ${kline.high.toFixed(2).padEnd(8)}  ${kline.low.toFixed(2).padEnd(8)}  ${kline.close.toFixed(2).padEnd(8)}  ${(kline.volume || 0).toString().padEnd(12)}`);
        });
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
    }
}
// 比较两只股票 K 线数据
async function cmdCompare(code1, code2) {
    console.log(`K-line comparison: ${code1} vs ${code2}\n`);
    try {
        const isOtc1 = code1.length > 4;
        const isOtc2 = code2.length > 4;
        const [klines1, klines2] = await Promise.all([
            fetchKlineData(code1, 12, isOtc1),
            fetchKlineData(code2, 12, isOtc2)
        ]);
        console.log(`\n${code1}: ${klines1.length} days, ${code2}: ${klines2.length} days\n`);
        console.log(`${'Date'.padEnd(12)}  ${code1.padEnd(8)}  ${code2.padEnd(8)}`);
        console.log('-'.repeat(40));
        const maxDays = Math.max(klines1.length, klines2.length);
        for (let i = 0; i < Math.min(20, maxDays); i++) {
            const k1 = klines1[klines1.length - 20 + i];
            const k2 = klines2[klines2.length - 20 + i];
            console.log(`${(k1?.date || 'N/A').padEnd(12)}  ${(k1?.close || 0).toFixed(2).padEnd(8)}  ${(k2?.close || 0).toFixed(2).padEnd(8)}`);
        }
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
    }
}
// 显示帮助信息
async function cmdHelp() {
    console.log(`TWETQ K-line Bot
================

Commands:
  kline-bot <code>                  1-year K-line for stock
  kline-bot <code> --months 24       2-year K-line
  kline-bot <code> --daily 100       Last 100 trading days
  kline-bot --compare <code1> <code2> Compare two stocks
  kline-bot --volume <code>          Volume analysis
  kline-bot help                     Show this help

Environment:
  TWETQ_LOCAL_URL       Override local server URL (default: http://127.0.0.1:8787)
`);
}
// 主函数
async function main() {
    const args = process.argv.slice(2);
    if (!args.length || args.includes('help')) {
        return cmdHelp();
    }
    const stockCode = !args.includes('--compare') && !args.includes('--volume') ? args[0] : null;
    const monthsArg = args.includes('--months') ? parseInt(args[args.indexOf('--months') + 1]) : 12;
    const dailyArg = args.includes('--daily') ? parseInt(args[args.indexOf('--daily') + 1]) : null;
    const compareIdx = args.indexOf('--compare');
    if (compareIdx >= 0) {
        return cmdCompare(args[compareIdx + 1], args[compareIdx + 2]);
    }
    if (stockCode) {
        return cmdSingleStock(stockCode, monthsArg);
    }
    console.log('Unknown command. Run "kline-bot help" for usage.');
    process.exitCode = 1;
}
// 执行主函数
main().catch((err) => { console.error(err); process.exitCode = 1; });
// 导出供其他模块使用
export { fetchKlineData, cmdSingleStock, cmdCompare, cmdHelp, main };
//# sourceMappingURL=kline-bot.js.map