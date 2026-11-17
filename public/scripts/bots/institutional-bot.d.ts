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
declare function cmdSingleStock(code: string): Promise<void>;
declare function cmdRank(): Promise<void>;
declare function cmdHelp(): Promise<void>;
declare function main(): Promise<void>;
export { cmdSingleStock, cmdRank, cmdHelp, main };
//# sourceMappingURL=institutional-bot.d.ts.map