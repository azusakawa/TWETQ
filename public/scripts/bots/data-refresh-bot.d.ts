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
interface RefreshResult {
    success: boolean;
    endpoint?: string;
    dataCount?: number;
    error?: string;
}
declare function refreshTpexData(dryRun: boolean): Promise<RefreshResult[]>;
declare function refreshMopsData(dryRun: boolean): Promise<RefreshResult[]>;
declare function checkStatus(): Promise<void>;
declare function cmdHelp(): Promise<void>;
declare function main(): Promise<void>;
export { refreshTpexData, refreshMopsData, checkStatus, cmdHelp, main };
//# sourceMappingURL=data-refresh-bot.d.ts.map