/**
 * Verification Bot — Comprehensive health checks for the TWETQ system.
 * TypeScript 版本
 *
 * CLI usage:
 *   node scripts/bots/verification-bot.mjs               # run all checks
 *   node scripts/bots/verification-bot.mjs api            # check API availability only
 *   node scripts/bots/verification-bot.mjs files          # check local file integrity
 *   node scripts/bots/verification-bot.mjs cache          # check cache status
 *   node scripts/bots/verification-bot.mjs config         # check configuration
 *   node scripts/bots/verification-bot.mjs --fail-fast    # stop on first failure
 *   node scripts/bots/verification-bot.mjs help
 */
declare function check(name: string, condition: boolean, details?: string): void;
declare function checkLocalServer(): Promise<void>;
declare function checkAPI(): Promise<void>;
declare function checkFiles(): Promise<void>;
declare function checkCache(): Promise<void>;
declare function checkConfig(): Promise<void>;
declare function cmdHelp(): Promise<void>;
declare function main(): Promise<void>;
export { check, checkLocalServer, checkAPI, checkFiles, checkCache, checkConfig, cmdHelp, main };
//# sourceMappingURL=verification-bot.d.ts.map