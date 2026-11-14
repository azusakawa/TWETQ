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
declare function cmdLatest(): Promise<void>;
declare function cmdEpisodes(): Promise<void>;
declare function cmdStocks(): Promise<void>;
declare function cmdSources(): Promise<void>;
declare function cmdHelp(): Promise<void>;
declare function main(): Promise<void>;
export { cmdLatest, cmdEpisodes, cmdStocks, cmdSources, cmdHelp, main };
//# sourceMappingURL=podcast-bot.d.ts.map