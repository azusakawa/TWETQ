#!/usr/bin/env node
/**
 * TWETQ Bot Launcher — Unified CLI for all TWETQ bots.
 *
 * Usage:
 *   node scripts/bots/index.mjs market snapshot
 *   node scripts/bots/index.mjs financial 2330
 *   node scripts/bots/index.mjs institutional --rank
 *   node scripts/bots/index.mjs podcast latest
 *   node scripts/bots/index.mjs screener high-dividend
 *   node scripts/bots/index.mjs kline 2330
 *   node scripts/bots/index.mjs refresh all
 *   node scripts/bots/index.mjs verify
 *   node scripts/bots/index.mjs help
 */

// 型別定義
interface BotConfig {
  [key: string]: string;
}

interface BotModule {
  path: string;
}

const BOTS: BotConfig = {
  market:     'market-bot.ts',
  financial:  'financial-bot.ts',
  institutional: 'institutional-bot.ts',
  podcast:    'podcast-bot.ts',
  screener:   'screener-bot.ts',
  kline:      'kline-bot.ts',
  refresh:    'data-refresh-bot.ts',
  verify:     'verification-bot.ts',
};

const PROJECT_DIR = process.env.TWETQ_PROJECT_DIR
  ? process.env.TWETQ_PROJECT_DIR
  : process.cwd();

function printHelp() {
  console.log(`TWETQ Bot Launcher
==================

Usage: node scripts/bots/index.mjs <bot> <command> [args...]

Bots:
  market        Real-time quotes, market snapshot, indexes
  financial     MOPS financial statements (single stock or batch)
  institutional 三大法人 (foreign/trust/dealer) radar
  podcast       Podcast episodes, stock tracker, source status
  screener      Filter and rank stocks by various criteria
  kline         Historical candlestick (K-line) charts
  refresh       Data refresh from Taiwan stock APIs
  verify        System health checks

Examples:
  node scripts/bots/index.mjs market snapshot
  node scripts/bots/index.mjs financial 2330 --list
  node scripts/bots/index.mjs institutional --rank
  node scripts/bots/index.mjs screener high-dividend
  node scripts/bots/index.mjs kline 2330 --months 24
  node scripts/bots/index.mjs refresh all
  node scripts/bots/index.mjs verify

Environment:
  TWETQ_LOCAL_URL   Override local server URL (default: http://127.0.0.1:8787)
  TWETQ_PROJECT_DIR Override project directory (default: current working dir)
`);
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length || args.includes('help') || args.includes('--help') || args.includes('-h')) {
    return printHelp();
  }
  
  const botName = args[0].toLowerCase();
  const botModule = BOTS[botName];
  
  if (!botModule) {
    console.error(`Unknown bot: ${botName}`);
    console.log('Available bots:', Object.keys(BOTS).join(', '));
    console.log('Run "index.mjs help" for usage.');
    process.exitCode = 1;
    return;
  }
  
  const botPath = `${PROJECT_DIR}/scripts/bots/${botModule}`;
  // 動態匯入和執行
  try {
    const bot = await import(`file://${botPath}`, { with: { type: 'module' } });
    if (typeof bot.main === 'function') {
      await bot.main();
    } else {
      console.error(`Bot ${botName} does not export a main function`);
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(`Failed to run bot ${botName}:`, error);
    process.exitCode = 1;
  }
}

// 當直接執行此腳本時運行主函數
if (require.main === module) {
  main().catch((error) => {
    console.error('Error running bot launcher:', error);
    process.exit(1);
  });
}

export { main, printHelp };