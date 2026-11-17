/**
 * K-line (Candlestick) Bot — Historical price data, chart analysis.
 * TypeScript 版本
 *
 * CLI usage:
 *   node scripts/bots/kline-bot.mjs 2330                # 1-year K-line for TSMC
 *   node scripts/bots/kline-bot.mjs 2330 --months 24    # 2-year K-line
 *   node scripts/bots/kline-bot.mjs 2330 --daily 100    # last 100 trading days
 *   node scripts/bots/kline-bot.mjs --compare 2330 2880 # compare TSMC vs ASE
 *   node scripts/bots/kline-bot.mjs --volume 2330       # volume analysis
 *   node scripts/bots/kline-bot.mjs help
 */
interface KlineData {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
}
declare function fetchKlineData(code: string, months: number, isOtc: boolean): Promise<KlineData[]>;
declare function cmdSingleStock(code: string, months?: number): Promise<void>;
declare function cmdCompare(code1: string, code2: string): Promise<void>;
declare function cmdHelp(): Promise<void>;
declare function main(): Promise<void>;
export { fetchKlineData, cmdSingleStock, cmdCompare, cmdHelp, main };
//# sourceMappingURL=kline-bot.d.ts.map