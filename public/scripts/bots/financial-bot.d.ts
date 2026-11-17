/**
 * Financial Data Bot — MOPS financial statements, balance sheet, income statement.
 * TypeScript 版本
 *
 * CLI usage:
 *   node scripts/bots/financial-bot.mjs 2330           # get MOPS financials for TSMC
 *   node scripts/bots/financial-bot.mjs 2330 --list    # list all financial endpoints
 *   node scripts/bots/financial-bot.mjs 2330 balance   # balance sheet only
 *   node scripts/bots/financial-bot.mjs 2330 income    # income statement only
 *   node scripts/bots/financial-bot.mjs 2330 cashflow  # cash flow statement
 *   node scripts/bots/financial-bot.mjs --batch listed # batch: all listed company financials (t187ap03/t187ap06/t187ap07)
 *   node scripts/bots/financial-bot.mjs --batch otc    # batch: all OTC company financials
 *   node scripts/bots/financial-bot.mjs --top 20       # top 20 companies by revenue
 *   node scripts/bots/financial-bot.mjs help
 */
declare function cmdSingleStock(code: string, statementType: string | null): Promise<void>;
declare function cmdBatch(market: string, topN?: number): Promise<void>;
declare function cmdHelp(): Promise<void>;
declare function main(): Promise<void>;
export { cmdSingleStock, cmdBatch, cmdHelp, main };
//# sourceMappingURL=financial-bot.d.ts.map