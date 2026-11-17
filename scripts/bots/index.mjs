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

const BOTS = {
  market:     'market-bot.mjs',
  financial:  'financial-bot.mjs',
  institutional: 'institutional-bot.mjs',
  podcast:    'podcast-bot.mjs',
  screener:   'screener-bot.mjs',
  kline:      'kline-bot.mjs',
  refresh:    'data-refresh-bot.mjs',
  verify:     'verification-bot.mjs',
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
  // Dynamically import and run
  try {
    await import(`file://${botPath}`, { with: { type: 'module' } });
  } catch (err) {
    // If dynamic import with 'with' fails (older Node), use import()
    try {
      await import(`file://${botPath}`);
    } catch (innerErr) {
      console.error(`Failed to load bot ${botName}: ${innerErr.message}`);
      process.exitCode = 1;
    }
  }
}

main().catch((err) => { console.error(err); process.exitCode = 1; });
