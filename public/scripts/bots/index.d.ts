#!/usr/bin/env node
/**
 * TWETQ Bot Launcher — Unified CLI for all TWETQ bots.
 * TypeScript 版本
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
interface BotConfig {
    [key: string]: string;
}
interface BotModule {
    path: string;
}
declare const BOTS: BotConfig;
declare const PROJECT_DIR: string;
declare function printHelp(): void;
declare function main(): Promise<void>;
//# sourceMappingURL=index.d.ts.map