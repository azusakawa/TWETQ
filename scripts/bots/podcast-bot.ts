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

// 类型定义
interface PodcastEpisode {
  title?: string;
  date?: string;
  publishDate?: string;
  publish_date?: string;
  updatedAt?: string;
  sourceUpdatedAt?: string;
  lastSourceUpdatedAt?: string;
  stale?: boolean;
  summary?: string;
  content?: string;
  [key: string]: unknown;
}

interface PodcastData {
  ok: boolean;
  episode?: PodcastEpisode;
  data?: PodcastEpisode;
  episodes?: PodcastEpisode[];
  stocks?: { code: string; name: string }[];
  sources?: { name: string; status: string }[];
  error?: string;
}

interface EpisodeListData {
  ok: boolean;
  episodes?: PodcastEpisode[];
  error?: string;
}

// 本地服务器基础 URL
const LOCAL_BASE = process.env.TWETQ_LOCAL_URL
  ? new URL(process.env.TWETQ_LOCAL_URL.endsWith('/') ? process.env.TWETQ_LOCAL_URL : `${process.env.TWETQ_LOCAL_URL}/`).href
  : 'http://127.0.0.1:8787/';

// 获取 JSON 数据
async function fetchJson<T>(pathname: string): Promise<T> {
  const url = new URL(pathname, LOCAL_BASE);
  const res = await fetch(url.href, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${pathname}`);
  return res.json() as Promise<T>;
}

// 最新集数信息
async function cmdLatest(): Promise<void> {
  console.log('Latest Podcast Episode\n');
  try {
    const data = await fetchJson<PodcastData>('/api/podcast/latest');
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
      console.log(summary.substring(0, 500) + (String(summary).length > 500 ? '...' : ''));
    }
  } catch (err: unknown) {
    console.error(`Error: ${(err as Error).message}`);
  }
}

// 所有集数
async function cmdEpisodes(): Promise<void> {
  console.log('All Podcast Episodes\n');
  try {
    const data = await fetchJson<EpisodeListData>('/api/podcast/episodes');
    if (!data.ok || !data.episodes) {
      console.log('No episodes available.');
      return;
    }
    data.episodes.forEach((ep: PodcastEpisode, index: number) => {
      console.log(`${index + 1}. ${ep.title || 'N/A'} (${ep.date || ep.publishDate || 'N/A'})`);
    });
  } catch (err: unknown) {
    console.error(`Error: ${(err as Error).message}`);
  }
}

// 股票追踪
async function cmdStocks(): Promise<void> {
  console.log('Podcast Stock Tracker\n');
  try {
    const data = await fetchJson<PodcastData>('/api/podcast/stocks');
    if (!data.ok || !data.stocks) {
      console.log('No stock tracking data available.');
      return;
    }
    data.stocks.forEach(stock => {
      console.log(`${stock.code}: ${stock.name}`);
    });
  } catch (err: unknown) {
    console.error(`Error: ${(err as Error).message}`);
  }
}

// 数据源状态
async function cmdSources(): Promise<void> {
  console.log('Data Source Status\n');
  try {
    const data = await fetchJson<PodcastData>('/api/podcast/sources');
    if (!data.ok || !data.sources) {
      console.log('No source status available.');
      return;
    }
    data.sources.forEach(source => {
      console.log(`${source.name}: ${source.status}`);
    });
  } catch (err: unknown) {
    console.error(`Error: ${(err as Error).message}`);
  }
}

// 显示帮助信息
async function cmdHelp(): Promise<void> {
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
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (!args.length || args.includes('help')) {
    return cmdHelp();
  }
  const cmd = args[0].toLowerCase();
  switch (cmd) {
    case 'latest':   await cmdLatest();  break;
    case 'episodes': await cmdEpisodes();  break;
    case 'stocks':   await cmdStocks();  break;
    case 'sources':  await cmdSources();  break;
    case 'summary':  await cmdLatest();  break;
    default:
      console.log(`Unknown command: ${cmd}`);
      console.log('Run "podcast-bot help" for usage.');
      process.exitCode = 1;
  }
}

// 执行主函数
main().catch((err: Error) => { console.error(err); process.exitCode = 1; });

// 导出供其他模块使用
export { cmdLatest, cmdEpisodes, cmdStocks, cmdSources, cmdHelp, main };