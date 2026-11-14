/**
 * Market Data Bot — Real-time quotes, market snapshot, market indexes.
 * TypeScript 版本
 *
 * CLI usage:
 *   node scripts/bots/market-bot.mjs snapshot          # latest market snapshot
 *   node scripts/bots/market-bot.mjs quotes 2330|2317   # real-time quotes for multiple stocks
 *   node scripts/bots/market-bot.mjs indexes            # TWSE + TPEx + TAIFEX indexes
 *   node scripts/bots/market-bot.mjs help               # usage info
 */
declare function cmdSnapshot(): Promise<void>;
declare function cmdQuotes(channels?: string): Promise<void>;
declare function cmdIndexes(): Promise<void>;
declare function cmdHelp(): Promise<void>;
declare function main(): Promise<void>;
export { cmdSnapshot, cmdQuotes, cmdIndexes, cmdHelp, main };
//# sourceMappingURL=market-bot.d.ts.map