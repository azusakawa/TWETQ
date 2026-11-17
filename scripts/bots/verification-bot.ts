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

import { join } from 'path';

// 类型定义
interface CheckResult {
  name: string;
  passed: boolean;
  details?: string;
}

interface VerificationResponse {
  ok: boolean;
  results?: CheckResult[];
  error?: string;
}

// 项目目录和本地服务器基础 URL
const PROJECT_DIR = process.env.TWETQ_PROJECT_DIR
  ? process.env.TWETQ_PROJECT_DIR
  : process.cwd();
const LOCAL_BASE = process.env.TWETQ_LOCAL_URL
  ? new URL(process.env.TWETQ_LOCAL_URL.endsWith('/') ? process.env.TWETQ_LOCAL_URL : `${process.env.TWETQ_LOCAL_URL}/`).href
  : 'http://127.0.0.1:8787/';

const RESULTS: CheckResult[] = [];
let failFast = false;

function check(name: string, condition: boolean, details?: string): void {
  const passed = !!condition;
  RESULTS.push({ name, passed, details });
  if (failFast && !passed) {
    console.error(`FAILED: ${name}`);
    console.error(details || '');
    process.exitCode = 1;
    return;
  }
  console.log(`${passed ? 'PASS' : 'FAIL'}: ${name}${details ? ` — ${details}` : ''}`);
}

// 检查本地服务器状态
async function checkLocalServer(): Promise<void> {
  console.log('\n=== Local Server Status ===');
  try {
    const res = await fetch(new URL('/api/health', LOCAL_BASE).href, { signal: AbortSignal.timeout(5000) });
    check('Local server', res.ok, res.ok ? 'Server is running' : 'Server not responding');
  } catch {
    check('Local server', false, 'Connection failed');
  }
}

// 检查 API 可用性
async function checkAPI(): Promise<void> {
  console.log('\n=== API Availability ===');
  const endpoints = ['/api/market/snapshot', '/api/podcast/latest', '/api/market/indexes'];
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(new URL(endpoint, LOCAL_BASE).href, { signal: AbortSignal.timeout(5000) });
      check(endpoint, res.ok, res.ok ? 'Available' : `HTTP ${res.status}`);
    } catch {
      check(endpoint, false, 'Connection failed');
    }
  }
}

// 检查本地文件完整性
async function checkFiles(): Promise<void> {
  console.log('\n=== File Integrity ===');
  const requiredFiles = ['src/worker.js', 'public/app.js', 'public/sw.js', 'public/vue-shell.js'];
  for (const file of requiredFiles) {
    const path = join(PROJECT_DIR, file);
    check(file, require('fs').existsSync(path), require('fs').existsSync(path) ? `${require('fs').statSync(path).size} bytes` : 'Missing');
  }
}

// 检查缓存状态
async function checkCache(): Promise<void> {
  console.log('\n=== Cache Status ===');
  try {
    const res = await fetch(new URL('/api/health', LOCAL_BASE).href, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      check('Cache status', true, data.cacheStatus || 'Unknown');
    } else {
      check('Cache status', false, 'Server not responding');
    }
  } catch {
    check('Cache status', false, 'Connection failed');
  }
}

// 检查配置
async function checkConfig(): Promise<void> {
  console.log('\n=== Configuration ===');
  const envVars = ['TWETQ_LOCAL_URL', 'TWETQ_PROJECT_DIR'];
  for (const envVar of envVars) {
    check(`Environment: ${envVar}`, !!process.env[envVar], process.env[envVar] || 'Not set');
  }
}

// 显示帮助信息
async function cmdHelp(): Promise<void> {
  console.log(`TWETQ Verification Bot
======================

Commands:
  verification-bot               Run all checks
  verification-bot api           Check API availability only
  verification-bot files         Check local file integrity
  verification-bot cache         Check cache status
  verification-bot config        Check configuration
  verification-bot --fail-fast   Stop on first failure
  verification-bot help          Show this help

Environment:
  TWETQ_LOCAL_URL       Override local server URL (default: http://127.0.0.1:8787)
  TWETQ_PROJECT_DIR     Override project directory (default: current working dir)
`);
}

// 主函数
async function main(): Promise<void> {
  let args = process.argv.slice(2);
  if (!args.length || args.includes('help')) {
    return cmdHelp();
  }
  
  if (args.includes('--fail-fast')) {
    failFast = true;
    const filtered = args.filter(a => a !== '--fail-fast');
    args = filtered;
  }
  
  const cmd = args[0] || 'all';
  
  switch (cmd) {
    case 'api':       await checkAPI();  break;
    case 'files':     await checkFiles();  break;
    case 'cache':     await checkCache();  break;
    case 'config':    await checkConfig();  break;
    default:          await checkLocalServer(); await checkAPI(); await checkFiles(); await checkCache(); await checkConfig();  break;
  }
  
  const passed = RESULTS.filter(r => r.passed).length;
  const failed = RESULTS.filter(r => !r.passed).length;
  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

// 执行主函数
main().catch((err: Error) => { console.error(err); process.exitCode = 1; });

// 导出供其他模块使用
export { check, checkLocalServer, checkAPI, checkFiles, checkCache, checkConfig, cmdHelp, main };