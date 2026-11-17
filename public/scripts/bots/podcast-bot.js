/**
 * Podcast Bot — Episode management, editorial content, stock tracker.
 * TypeScript 版本
 *
 * CLI usage:
 *   node scripts/bots/podcast-bot.mjs latest            # latest episode info
 *   node scripts/bots/podcast-bot.mjs episodes           # all episodes
 *   node scripts/bots/podcast-bot.mjs stocks            # stocks tracked in podcast
 *   node scripts/bots/podcast-bot.mjs sources           # data source status
 *   node scripts/bots/podcast-bot.mjs summary            # episode summary with stale warning
 *   node scripts/bots/podcast-bot.mjs help
 */
// 本地服务器基础 URL
const LOCAL_BASE = process.env.TWETQ_LOCAL_URL
    ? new URL(process.env.TWETQ_LOCAL_URL.endsWith('/') ? process.env.TWETQ_LOCAL_URL : `${process.env.TWETQ_LOCAL_URL}/`).href
    : 'http://127.0.0.1:8787/';
// 获取 JSON 数据
async function fetchJson(pathname) {
    const url = new URL(pathname, LOCAL_BASE);
    const res = await fetch(url.href, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok)
        throw new Error(`HTTP ${res.status} for ${pathname}`);
    return res.json();
}
// 最新集数信息
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
        console.log(`Status:  ${ep.stale ? 'Data stale' : 'Fresh'}`);
        console.log(`Source:  ${ep.sourceLastUpdatedAt || ep.lastSourceUpdatedAt || ep.sourceUpdatedAt || 'N/A'}`);
        console.log('');
        if (ep.summary || ep.content) {
            const summary = ep.summary || ep.content;
            if (summary) {
                console.log(String(summary).substring(0, 500) + (String(summary).length > 500 ? '...' : ''));
            }
        }
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
    }
}
// 所有集数
async function cmdEpisodes() {
    console.log('All Podcast Episodes\n');
    try {
        const data = await fetchJson('/api/podcast/episodes');
        if (!data.ok || !data.episodes) {
            console.log('No episodes available.');
            return;
        }
        data.episodes.forEach((ep, index) => {
            console.log(`${index + 1}. ${ep.title || 'N/A'} (${ep.date || ep.publishDate || 'N/A'})`);
        });
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
    }
}
// 股票追踪
async function cmdStocks() {
    console.log('Podcast Stock Tracker\n');
    try {
        const data = await fetchJson('/api/podcast/stocks');
        if (!data.ok || !data.stocks) {
            console.log('No stock tracking data available.');
            return;
        }
        data.stocks.forEach(stock => {
            console.log(`${stock.code}: ${stock.name}`);
        });
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
    }
}
// 数据源状态
async function cmdSources() {
    console.log('Data Source Status\n');
    try {
        const data = await fetchJson('/api/podcast/sources');
        if (!data.ok || !data.sources) {
            console.log('No source status available.');
            return;
        }
        data.sources.forEach(source => {
            console.log(`${source.name}: ${source.status}`);
        });
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
    }
}
// 显示帮助信息
async function cmdHelp() {
    console.log(`TWETQ Podcast Bot
================

Commands:
  podcast-bot latest        Latest episode info
  podcast-bot episodes      All episodes
  podcast-bot stocks        Stocks tracked in podcast
  podcast-bot sources       Data source status
  podcast-bot summary       Episode summary with stale warning
  podcast-bot help          Show this help

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
    const cmd = args[0].toLowerCase();
    switch (cmd) {
        case 'latest':
            await cmdLatest();
            break;
        case 'episodes':
            await cmdEpisodes();
            break;
        case 'stocks':
            await cmdStocks();
            break;
        case 'sources':
            await cmdSources();
            break;
        case 'summary':
            await cmdLatest();
            break;
        default:
            console.log(`Unknown command: ${cmd}`);
            console.log('Run "podcast-bot help" for usage.');
            process.exitCode = 1;
    }
}
// 执行主函数
main().catch((err) => { console.error(err); process.exitCode = 1; });
// 导出供其他模块使用
export { cmdLatest, cmdEpisodes, cmdStocks, cmdSources, cmdHelp, main };
//# sourceMappingURL=podcast-bot.js.map