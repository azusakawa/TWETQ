/**
 * Institutional Radar Bot — 三大法人 (foreign, trust, dealer) fund flow analysis.
 * TypeScript 版本
 *
 * CLI usage:
 *   node scripts/bots/institutional-bot.mjs 2330            # single stock institutional data
 *   node scripts/bots/institutional-bot.mjs --rank          # overall institutional ranking
 *   node scripts/bots/institutional-bot.mjs --sector        # sector-level institutional flow
 *   node scripts/bots/institutional-bot.mjs --net 100000000 # stocks with net foreign buying > 100M
 *   node scripts/bots/institutional-bot.mjs --concentrate 20  # fund concentration top 20
 *   node scripts/bots/institutional-bot.mjs help
 */
// 本地服务器基础 URL
const LOCAL_BASE = process.env.TWETQ_LOCAL_URL
    ? new URL(process.env.TWETQ_LOCAL_URL.endsWith('/') ? process.env.TWETQ_LOCAL_URL : `${process.env.TWETQ_LOCAL_URL}/`).href
    : 'http://127.0.0.1:8787/';
// 获取 JSON 数据
async function fetchJson(pathname, signal) {
    const url = new URL(pathname, LOCAL_BASE);
    const res = await fetch(url.href, { signal: signal || AbortSignal.timeout(30_000) });
    if (!res.ok)
        throw new Error(`HTTP ${res.status} for ${pathname}`);
    return res.json();
}
// 单个股票法人交易数据
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
        // 从代码长度确定市场
        const ex = code.length > 4 ? 'OTC' : 'TWSE';
        // 显示每日法人数据
        console.log(`${ex} Institutional Daily Trading (${rows.length} days)\n`);
        // 表头
        const headers = Object.keys(rows[0]);
        console.log(headers
            .map(h => h.padEnd(12))
            .join('  '));
        console.log('-'.repeat(headers.reduce((sum, h) => sum + h.length, 0) + headers.length * 3));
        // 显示最后 10 天（最新的在前）
        rows.slice(-10).reverse().forEach(row => {
            console.log(headers.map(h => String(row[h] ?? '').padEnd(12)).join('  '));
        });
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
    }
}
// 整体法人排名
async function cmdRank() {
    console.log('Overall Institutional Ranking\n');
    try {
        const data = await fetchJson('/api/institutional-radar?rank=true');
        if (!data.ok || !data.rankings) {
            console.log('No ranking data available.');
            return;
        }
        const rows = data.rankings;
        console.log(`${rows.length} stocks ranked\n`);
        const headers = Object.keys(rows[0]);
        console.log(headers.map(h => h.padEnd(15)).join('  '));
        console.log('-'.repeat(headers.reduce((sum, h) => sum + h.length, 0) + headers.length * 3));
        rows.slice(0, 20).forEach(row => {
            console.log(headers.map(h => String(row[h] ?? '').padEnd(15)).join('  '));
        });
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
    }
}
// 显示帮助信息
async function cmdHelp() {
    console.log(`TWETQ Institutional Radar Bot
============================

Commands:
  institutional-bot <code>        Single stock institutional data
  institutional-bot --rank        Overall institutional ranking
  institutional-bot --sector      Sector-level institutional flow
  institutional-bot --net <amount> Stocks with net foreign buying > amount
  institutional-bot --concentrate <n> Fund concentration top N
  institutional-bot help          Show this help

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
    const stockCode = !args.includes('--rank') && !args.includes('--sector') && !args.includes('--net') && !args.includes('--concentrate') ? args[0] : null;
    if (stockCode) {
        return cmdSingleStock(stockCode);
    }
    if (args.includes('--rank')) {
        return cmdRank();
    }
    console.log('Unknown command. Run "institutional-bot help" for usage.');
    process.exitCode = 1;
}
// 执行主函数
main().catch((err) => { console.error(err); process.exitCode = 1; });
// 导出供其他模块使用
export { cmdSingleStock, cmdRank, cmdHelp, main };
//# sourceMappingURL=institutional-bot.js.map