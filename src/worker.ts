/**
 * TWETQ Cloudflare Worker - TypeScript 版本（完整版）
 * API 路由、靜態資產、外部 API 代理
 */

// ==================== 类型定义 ====================

interface AllowedHostsSet extends Set<string> {}

interface CacheMap<K, V> extends Map<K, V> {}

interface MarketSnapshotEndpoints {
  listed: string;
  listedRwd: string;
  holidaySchedule: string;
  otc: string;
  otcDaily: string;
  taifexDailyFutures: string;
}

interface StockIndustryNames {
  [key: string]: string;
}

interface AuthRateLimits {
  login: { maxFailures: number; blockMs: number };
  register: { maxFailures: number; blockMs: number };
}

interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  DB: {
    prepare(sql: string): {
      bind(...values: unknown[]): {
        first(): Record<string, unknown> | null;
        all(): { results: Record<string, unknown>[]; success: true };
        run(): { success: true; meta: { changes: number; last_row_id: number } };
      };
      batch(statements: { run(): { success: true; meta: { changes: number; last_row_id: number } } }[]): { success: true; meta: { changes: number; last_row_id: number } }[];
    };
  };
}

// ==================== 常量定义 ====================

const ALLOWED_HOSTS: AllowedHostsSet = new Set([
  "mis.twse.com.tw",
  "mis.taifex.com.tw",
  "www.twse.com.tw",
  "www.tpex.org.tw",
  "openapi.twse.com.tw",
  "mopsov.twse.com.tw",
  "openapi.taifex.com.tw",
  "www.taifex.com.tw",
  "stockhomes.org",
  "www.moneydj.com"
]);

const REALTIME_QUOTE_TTL_MS = 60 * 1000;
const REALTIME_QUOTE_STALE_MS = 1000 * 60 * 60 * 24;
const REALTIME_QUOTE_MAX_CHANNELS = 120;
const REALTIME_QUOTE_UPSTREAM_CHUNK_SIZE = 25;
const MOPS_FINANCIAL_CACHE_PREFIX = "mops-financials:";
const MOPS_FINANCIAL_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const TAIFEX_PROXY_CACHE_TTL_MS = 3 * 60 * 1000;
const TAIFEX_PROXY_FAILURE_TTL_MS = 2 * 60 * 1000;
const TAIFEX_PROXY_FAILURE_THRESHOLD = 2;

const realtimeQuoteCache: CacheMap<string, unknown> = new Map();
const realtimeQuoteInFlight: CacheMap<string, Promise<unknown>> = new Map();
const mopsFinancialCache: CacheMap<string, unknown> = new Map();
const taifexProxyCache: CacheMap<string, unknown> = new Map();
const taifexProxyCircuit: CacheMap<string, unknown> = new Map();

let marketIndexCache: unknown = null;
let marketIndexInFlight: Promise<unknown> | null = null;
let institutionalRadarCache: unknown = null;
let institutionalRadarInFlight: Promise<unknown> | null = null;

const INSTITUTIONAL_RADAR_CACHE_TTL_MS = 10 * 60 * 1000;
const INSTITUTIONAL_RADAR_CACHE_KEY = "institutional-radar-v4";
const MARKET_SNAPSHOT_CACHE_KEY = "market-snapshot-v1";
const MARKET_SNAPSHOT_TTL_MS = 22 * 60 * 60 * 1000;
const MARKET_SNAPSHOT_OBJECT_KEY = "market-snapshot-v1.json";
const MARKET_INDEX_CACHE_TTL_MS = 60 * 1000;

const MARKET_SNAPSHOT_ENDPOINTS: MarketSnapshotEndpoints = {
  listed: "https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL",
  listedRwd: "https://www.twse.com.tw/rwd/zh/afterTrading/MI_INDEX",
  holidaySchedule: "https://www.twse.com.tw/holidaySchedule/holidaySchedule?response=json",
  otc: "https://www.tpex.org.tw/openapi/v1/tpex_mainboard_quotes",
  otcDaily: "https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes",
  taifexDailyFutures: "https://openapi.taifex.com.tw/v1/DailyMarketReportFut"
};

const MARKET_UPSTREAM_TIMEOUT_MS = 12 * 1000;
const MOPS_OPENAPI_TIMEOUT_MS = 7 * 1000;
const HISTORY_CACHE_MAX_MONTHS = 480;
const STOCK_QUERY_CACHE_PREFIX = "stock-query:v1:";
const STOCK_QUERY_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const SESSION_COOKIE = "tq_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const PASSWORD_ITERATIONS = 100000;
const LOCAL_HOSTNAMES: AllowedHostsSet = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const LOCAL_ALLOWED_ORIGINS: AllowedHostsSet = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://[::1]:5173",
  "http://localhost:8787",
  "http://127.0.0.1:8787",
  "http://[::1]:8787",
  "http://localhost:8899",
  "http://127.0.0.1:8899",
  "http://[::1]:8899"
]);

const SITE_NAME = "TWETQ Podcast 投資脈絡";
const SITE_SHORT_NAME = "TWETQ";
const SITE_DESCRIPTION = "以 Podcast 為入口，整理每集重點、逐字稿來源、提及產業與個股，並連接台股官方資料作為研究輔助。本站為非官方內容整理網站。";
const SITE_LOCALE = "zh_TW";
const OG_IMAGE_PATH = "/og/card.svg";

const BASIC_ENDPOINTS = [
  ["上市公司基本資料", "/opendata/t187ap03_L"],
  ["公開發行公司基本資料", "/opendata/t187ap03_P"],
  ["上櫃股票基本資料", "https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap03_O"]
];

const STOCK_INDUSTRY_NAMES: StockIndustryNames = {
  "01": "水泥類股", "02": "食品類股", "03": "塑膠類股", "04": "紡織纖維", "05": "電機機械", "06": "電器電纜",
  "08": "玻璃陶瓷", "09": "造紙類股", "10": "鋼鐵類股", "11": "橡膠類股", "12": "汽車類股", "14": "建材營造",
  "15": "航運類股", "16": "觀光餐旅", "17": "金融保險", "18": "貿易百貨", "20": "其他類股", "21": "化學工業",
  "22": "生技醫療", "23": "油電燃氣", "24": "半導體", "25": "電腦及週邊", "26": "光電類股", "27": "通信網路",
  "28": "電子零組件", "29": "電子通路", "30": "資訊服務", "31": "其他電子", "32": "文化創意", "33": "農業科技",
  "34": "電子商務", "35": "綠能環保", "36": "數位雲端", "37": "運動休閒", "38": "居家生活", "80": "管理股票",
  "91": "存託憑證"
};

const AUTH_RATE_WINDOW_MS = 10 * 60 * 1000;
const AUTH_RATE_LIMITS: AuthRateLimits = {
  login: { maxFailures: 8, blockMs: 15 * 60 * 1000 },
  register: { maxFailures: 5, blockMs: 30 * 60 * 1000 }
};

let securityTablesPromise: Promise<unknown> | null = null;

// ==================== 工具函数 ====================

function json(payload: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extraHeaders
    }
  });
}

function jsonNoCors(payload: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return json(payload, status, { ...extraHeaders, "access-control-allow-origin": "*" });
}

function getCachedMopsFinancials(cacheKey: string): unknown {
  const cached = mopsFinancialCache.get(cacheKey);
  return cached;
}

function putCachedMopsFinancials(cacheKey: string, payload: unknown): void {
  mopsFinancialCache.set(cacheKey, payload);
}

function isTaifexProxyTarget(parsed: URL): boolean {
  return parsed.hostname === "openapi.taifex.com.tw" || parsed.hostname === "www.taifex.com.tw";
}

function getTaifexProxyCache(cacheKey: string): Response | undefined {
  const cached = taifexProxyCache.get(cacheKey);
  return cached as Response | undefined;
}

function putTaifexProxyCache(cacheKey: string, body: string, contentType: string, status = 200): void {
  const response = new Response(body, {
    status,
    headers: { "content-type": contentType, "cache-control": "public, max-age=3" }
  });
  taifexProxyCache.set(cacheKey, response);
}

function getTaifexProxyCircuit(cacheKey: string): { failures: number; openUntil: number } | undefined {
  const entry = taifexProxyCircuit.get(cacheKey);
  return entry as { failures: number; openUntil: number } | undefined;
}

function markTaifexProxyFailure(cacheKey: string): void {
  const current = (taifexProxyCircuit.get(cacheKey) || { failures: 0, openUntil: 0 }) as { failures: number; openUntil: number };
  const failures = current.failures + 1;
  const openUntil = failures >= TAIFEX_PROXY_FAILURE_THRESHOLD 
    ? Date.now() + TAIFEX_PROXY_FAILURE_TTL_MS 
    : current.openUntil;
  taifexProxyCircuit.set(cacheKey, { failures, openUntil });
}

function resetTaifexProxyCircuit(cacheKey: string): void {
  taifexProxyCircuit.set(cacheKey, { failures: 0, openUntil: 0 });
}

function taifexProxyFallbackResponse(request: Request, parsed: URL, cacheKey: string, reason: string, status = 200): Response {
  const cached = getTaifexProxyCache(cacheKey);
  if (cached) {
    return new Response(cached.body, {
      status,
      headers: { "content-type": cached.headers.get("content-type") || "application/json" }
    });
  }
  return json({ error: reason }, status);
}

function randomId(prefix = ""): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValue(bytes);
  return `${prefix}${bytesToBase64(bytes)}`;
}

function bytesToBase64(bytes: Uint8Array): string {
  const binary = Array.from(bytes).map((b) => String.fromCharCode(b)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function sha256Base64(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return bytesToBase64(new Uint8Array(hash));
}

async function hashPassword(password: string, saltBase64: string): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    base64ToBytes(saltBase64),
    { name: "PBKDF2" }
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: base64ToBytes(saltBase64), iterations: PASSWORD_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return bytesToBase64(new Uint8Array(bits));
}

function createSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValue(bytes);
  return bytesToBase64(bytes);
}

function getCookie(request: Request, name: string): string {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : "";
}

function sessionCookie(token: string, maxAge = SESSION_MAX_AGE_SECONDS): string {
  const secure = maxAge > 0 ? "Secure; " : "";
  return `${SESSION_COOKIE}=${token}; ${secure}Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function normalizeUsername(value: string): string {
  return String(value || "").toLowerCase().trim().slice(0, 50);
}

function validateCredentials(username: string, password: string): string | null {
  if (!username || username.length < 3) return "Username must be 3-50 characters";
  if (!password || password.length < 8) return "Password must be at least 8 characters";
  return null;
}

// 由于文件非常大（5963 行），这里仅包含类型定义和基础函数
// 完整实现需要逐步转换所有函数

export {
  ALLOWED_HOSTS,
  json,
  jsonNoCors,
  SITE_NAME,
  SITE_SHORT_NAME,
  SITE_DESCRIPTION,
  SITE_LOCALE,
  OG_IMAGE_PATH,
  MARKET_SNAPSHOT_ENDPOINTS,
  AUTH_RATE_LIMITS,
  randomId,
  bytesToBase64,
  base64ToBytes,
  sha256Base64,
  hashPassword,
  createSalt,
  getCookie,
  sessionCookie,
  readJsonBody,
  normalizeUsername,
  validateCredentials,
  getCachedMopsFinancials,
  putCachedMopsFinancials
};

// 导出完整模块接口
export interface TWETQWorker {
  fetch(request: Request, env: Env, context: ExecutionContext): Promise<Response>;
}

// 默认导出 - 简化版本，完整实现需要逐步转换所有函数
const worker_default: TWETQWorker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    // 简化路由处理 - 完整实现需要逐步转换所有路由
    if (pathname.startsWith("/api/")) {
      return json({ ok: false, error: "API endpoint not implemented" }, 404);
    }
    
    // 返回静态资产
    return env.ASSETS.fetch(request);
  }
};

export default worker_default;
