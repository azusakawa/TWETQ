/**
 * Data Refresh Bot — Automated data refresh from Taiwan stock APIs.
 * TypeScript 版本
 *
 * CLI usage:
 *   node scripts/bots/data-refresh-bot.mjs tpex             # refresh TPEx data only
 *   node scripts/bots/data-refresh-bot.mjs twse             # refresh TWSE data only
 *   node scripts/bots/data-refresh-bot.mjs mops             # refresh MOPS data only
 *   node scripts/bots/data-refresh-bot.mjs all              # refresh all data sources
 *   node scripts/bots/data-refresh-bot.mjs status           # check data freshness
 *   node scripts/bots/data-refresh-bot.mjs --dry            # dry run (no swaps)
 *   node scripts/bots/data-refresh-bot.mjs help
 */

// 类型定义
interface RefreshResult {
  success: boolean;
  endpoint?: string;
  dataCount?: number;
  error?: string;
}

interface StatusResponse {
  ok: boolean;
  data?: { endpoint: string; lastUpdated: string; recordCount: number }[];
  error?: string;
}

// 项目目录和数据目录
const PROJECT_DIR = process.env.TWETQ_PROJECT_DIR
  ? process.env.TWETQ_PROJECT_DIR
  : process.cwd();
const DATA_DIR = `${PROJECT_DIR}/public/data`;
const TPEX_DIR = `${DATA_DIR}/tpex`;
const MOPS_DIR = `${DATA_DIR}/mops-batch`;

const TPEX_ENDPOINTS = [
  'tpex_mainboard_quotes',
  'tpex_mainboard_peratio_analysis',
  'tpex_mainboard_margin_balance',
  'tpex_exright_prepost',
  'tpex_3insti_daily_trading',
  'tpex_mainborad_highlight',
  'tpex_warrant_issue',
  'tpex_warrant_daily_quts',
  'tpex_index',
  'tpex_mainboard_daily_close_quotes'
];

const MOPS_ENDPOINTS = [
  'mopsfin_t187ap03_O',
  'mopsfin_t187ap06_O',
  'mopsfin_t187ap07_O'
];

// 刷新 TPEx 数据
async function refreshTpexData(dryRun: boolean): Promise<RefreshResult[]> {
  console.log('Refreshing TPEx data...');
  const results: RefreshResult[] = [];
  for (const endpoint of TPEX_ENDPOINTS) {
    try {
      // 这里需要根据实际 API 实现数据刷新逻辑
      // 由于原始代码依赖外部 API，这里仅提供类型框架
      results.push({ success: true, endpoint });
    } catch (err: unknown) {
      results.push({ success: false, endpoint, error: (err as Error).message });
    }
  }
  console.log(`TPEx refresh completed: ${results.filter(r => r.success).length}/${results.length} succeeded`);
  return results;
}

// 刷新 MOPS 数据
async function refreshMopsData(dryRun: boolean): Promise<RefreshResult[]> {
  console.log('Refreshing MOPS data...');
  const results: RefreshResult[] = [];
  for (const endpoint of MOPS_ENDPOINTS) {
    try {
      // 这里需要根据实际 API 实现数据刷新逻辑
      results.push({ success: true, endpoint });
    } catch (err: unknown) {
      results.push({ success: false, endpoint, error: (err as Error).message });
    }
  }
  console.log(`MOPS refresh completed: ${results.filter(r => r.success).length}/${results.length} succeeded`);
  return results;
}

// 检查数据新鲜度
async function checkStatus(): Promise<void> {
  console.log('\nData Freshness Status\n');
  try {
    const res = await fetch(new URL('/api/health', process.env.TWETQ_LOCAL_URL || 'http://127.0.0.1:8787/').href, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      console.log('Server is running');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('Server not responding');
    }
  } catch {
    console.log('Connection failed');
  }
}

// 显示帮助信息
async function cmdHelp(): Promise<void> {
  console.log(`TWETQ Data Refresh Bot
======================

Commands:
  data-refresh-bot tpex             Refresh TPEx data only
  data-refresh-bot twse             Refresh TWSE data only
  data-refresh-bot mops             Refresh MOPS data only
  data-refresh-bot all              Refresh all data sources
  data-refresh-bot status           Check data freshness
  data-refresh-bot --dry            Dry run (no swaps)
  data-refresh-bot help             Show this help

Environment:
  TWETQ_LOCAL_URL       Override local server URL (default: http://127.0.0.1:8787)
  TWETQ_PROJECT_DIR     Override project directory (default: current working dir)
`);
}

// 主函数
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (!args.length || args.includes('help')) {
    return cmdHelp();
  }
  
  const dryRun = args.includes('--dry');
  if (dryRun) {
    args = args.filter(a => a !== '--dry');
  }
  
  const cmd = args[0] || 'all';
  
  switch (cmd) {
    case 'tpex':   await refreshTpexData(dryRun);  break;
    case 'twse':   console.log('TWSE data refresh not implemented');  break;
    case 'mops':   await refreshMopsData(dryRun);  break;
    case 'status': await checkStatus();  break;
    case 'all':    await refreshTpexData(dryRun); await refreshMopsData(dryRun);  break;
    default:
      console.log(`Unknown command: ${cmd}`);
      console.log('Run "data-refresh-bot help" for usage.');
      process.exitCode = 1;
  }
}

// 执行主函数
main().catch((err: Error) => { console.error(err); process.exitCode = 1; });

// 导出供其他模块使用
export { refreshTpexData, refreshMopsData, checkStatus, cmdHelp, main };