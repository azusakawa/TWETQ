/**
 * Stock Screener Bot — Filter, rank, and screen stocks by various criteria.
 * TypeScript 版本
 *
 * CLI usage:
 *   node scripts/bots/screener-bot.mjs high-dividend          # high dividend stocks
 *   node scripts/bots/screener-bot.mjs low-pb                # low P/B ratio stocks
 *   node scripts/bots/screener-bot.mjs high-volume 1000000    # high volume stocks (default: 1M)
 *   node scripts/bots/screener-bot.mjs price-range 10 100     # stocks between $10-$100
 *   node scripts/bots/screener-bot.mjs etf-list                # list all ETFs
 *   node scripts/bots/screener-bot.mjs warrants               # list all warrants
 *   node scripts/bots/screener-bot.mjs positive               # stocks with positive P/E
 *   node scripts/bots/screener-bot.mjs --sector <sector>     # filter by industry sector
 *   node scripts/bots/screener-bot.mjs help
 */
declare function cmdHighDividend(): Promise<void>;
declare function cmdLowPB(): Promise<void>;
declare function cmdHighVolume(minVolume?: number): Promise<void>;
declare function cmdPriceRange(min: number, max: number): Promise<void>;
declare function cmdETFList(): Promise<void>;
declare function cmdWarrants(): Promise<void>;
declare function cmdHelp(): Promise<void>;
declare function main(): Promise<void>;
export { cmdHighDividend, cmdLowPB, cmdHighVolume, cmdPriceRange, cmdETFList, cmdWarrants, cmdHelp, main };
//# sourceMappingURL=screener-bot.d.ts.map