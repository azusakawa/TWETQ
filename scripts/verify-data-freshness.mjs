import { readFileSync } from "node:fs";
import { mergeOfficialMopsHistory, parseInlineXbrlFacts } from "../src/worker.js";

const files = {
  worker: readFileSync(new URL("../src/worker.js", import.meta.url), "utf8"),
  app: readFileSync(new URL("../public/app.js", import.meta.url), "utf8"),
  tpexRefresh: readFileSync(new URL("./refresh-tpex-data.mjs", import.meta.url), "utf8"),
};

function functionBody(text, name) {
  const signature = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`).exec(text);
  if (!signature) return "";
  const open = text.indexOf("{", signature.index + signature[0].length);
  if (open < 0) return "";

  let depth = 0;
  let quote = "";
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = open; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(open, index + 1);
    }
  }
  return "";
}

function hasObjectContract(text, keys, maxLength = 1600) {
  for (let start = text.indexOf("{"); start >= 0; start = text.indexOf("{", start + 1)) {
    const candidate = text.slice(start, start + maxLength);
    if (keys.every((key) => new RegExp(`\\b${key}\\s*:`).test(candidate))) return true;
  }
  return false;
}

const checks = [];
function check(name, ok, failure) {
  checks.push({ name, ok: Boolean(ok), failure });
}

const xbrlFacts = parseInlineXbrlFacts('<ix:nonFraction name="ifrs-full:OtherEquityInterest" contextRef="AsOf20250630" scale="3" sign="-">10,751</ix:nonFraction>');
check(
  "MOPS inline XBRL applies scale and sign",
  xbrlFacts.length === 1 && xbrlFacts[0].value === -10751000,
  `expected -10751000, found ${JSON.stringify(xbrlFacts)}`,
);

const mergedFinancials = mergeOfficialMopsHistory(
  { source: "OpenAPI", latest: { year: "2026", quarter: "2", parentEquity: 1200, otherEquity: null }, warnings: [] },
  { latest: { year: "2026", quarter: "2", parentEquity: 1100, otherEquity: -20 }, fourQuarterAgo: { parentEquity: 900 }, ttmParentNetIncome: 100, incomeQuarters: ["2026Q2", "2026Q1", "2025Q4", "2025Q3"], balanceQuarters: ["2026Q2", "2025Q2"], roeQuarters: [{ label: "2026Q2", parentEquity: 1100, otherEquity: -20 }], errors: [] },
);
check(
  "financial enrichment keeps current official values and fills history",
  mergedFinancials.latest.parentEquity === 1200 && mergedFinancials.latest.otherEquity === -20 && mergedFinancials.fourQuarterAgo.parentEquity === 900 && mergedFinancials.ttmParentNetIncome === 100,
  `unexpected merged financial payload ${JSON.stringify(mergedFinancials)}`,
);

check(
  "server-rendered reference pages request official MOPS history",
  /fetchStockSeoPayload\(env, code, 24, true\)/.test(files.worker)
    && /fetchOfficialMopsFinancials\(code, \{ includeHistory: true \}\)/.test(files.worker),
  "direct stock pages and /api/mops-financials must enable official history for the local app",
);

const snapshotBuilder = functionBody(files.worker, "buildMarketSnapshot");
const freshnessKeys = ["dataDate", "expectedDate", "stale", "fallback", "source", "warnings"];
check(
  "market snapshot exposes freshness metadata per source",
  /\bsources\s*:/.test(snapshotBuilder)
    && hasObjectContract(files.worker, freshnessKeys)
    && /\b(listed|twse)\s*:/.test(snapshotBuilder)
    && /\b(otc|tpex)\s*:/.test(snapshotBuilder),
  "buildMarketSnapshot must return sources for TWSE/listed and TPEx/otc, with each source contract carrying dataDate, expectedDate, stale, fallback, source, and warnings",
);

const listedSnapshotFetcher = functionBody(files.worker, "fetchTwseListedMarketSnapshot");
check(
  "TWSE listed snapshot has RWD daily-close primary plus OpenAPI fallback",
  /\/rwd\/zh\/afterTrading\/(?:MI_INDEX|STOCK_DAY_ALL)/i.test(files.worker)
    && /openapi\.twse\.com\.tw\/v1\/exchangeReport\/STOCK_DAY_ALL/i.test(files.worker)
    && /\b(primary|fallback)\b/i.test(listedSnapshotFetcher)
    && /\b(try|allSettled|catch)\b/.test(listedSnapshotFetcher),
  "fetchTwseListedMarketSnapshot must identify a TWSE RWD daily-close primary (MI_INDEX or STOCK_DAY_ALL) and the TWSE OpenAPI STOCK_DAY_ALL fallback, and handle primary failure explicitly",
);

const hasMopsIncomeEndpoints = /\/opendata\/t187ap06_L_(?:basi|bd|ci|fh|ins|mim)/.test(files.worker);
const hasMopsBalanceEndpoints = /\/opendata\/t187ap07_L_(?:basi|bd|ci|fh|ins|mim)/.test(files.worker);
const hasMopsTimeout = /\bMOPS[A-Z0-9_]*TIMEOUT(?:_MS)?\b/.test(files.worker)
  && /fetchJSONFromUpstream\([\s\S]{0,240}\bMOPS[A-Z0-9_]*TIMEOUT(?:_MS)?\b/.test(files.worker);
check(
  "MOPS OpenAPI financial endpoints use a bounded timeout",
  hasMopsIncomeEndpoints && hasMopsBalanceEndpoints && hasMopsTimeout,
  "financial loading must include listed-company MOPS OpenAPI t187ap06_L_* and t187ap07_L_* endpoints and pass an explicit MOPS timeout to fetchJSONFromUpstream",
);

const stockLookup = functionBody(files.app, "runStock");
check(
  "client does not render stale stock-cache data as a cache hit",
  /cached\?\.[\s\S]{0,320}/.test(stockLookup)
    && /(?:!\s*cached\??\.stale|cached\??\.stale\s*===\s*false|cached\??\.stale\s*!==\s*true)/.test(stockLookup),
  "the stock-cache render branch in runStock must require stale !== true before rendering cached financial/kline/profile data",
);

const institutionalHandler = functionBody(files.worker, "handleInstitutionalRadar");
const institutionalFetcher = functionBody(files.worker, "fetchInstitutionalRadarPayload");
const institutionalPageLoader = functionBody(files.app, "loadInstitutionalMarketRankingContext");
check(
  "institutional radar uses a database fetch-through cache and one shared backend payload",
  /INSTITUTIONAL_RADAR_CACHE_KEY/.test(files.worker)
    && /readAppCacheByKey\s*\(/.test(institutionalHandler)
    && /refreshInstitutionalRadarCache\s*\(/.test(institutionalHandler)
    && /writeAppCacheByKey\s*\(/.test(files.worker)
    && /readMarketSnapshotCache\s*\(/.test(institutionalFetcher)
    && /sharedData\s*:/.test(institutionalFetcher)
    && /sharedData/.test(institutionalPageLoader)
    && !/loadMarketQuotes\s*\(/.test(institutionalPageLoader)
    && !/loadInstitutionalRankingRows\s*\(/.test(institutionalPageLoader),
  "institutional radar must read the database first, fetch and persist on cache miss, reuse the market snapshot, and let the page build rankings from the same sharedData response",
);

check(
  "institutional radar is not anchored to lagging FMTQIK trading dates",
  /resolveMarketSnapshotExpectedDateTaipei\s*\(/.test(institutionalFetcher)
    && /fetchMarketIndexesPayload\s*\(/.test(institutionalFetcher)
    && !/tradingDays\s*=\s*\(Array\.isArray\(fmtqik\)/.test(institutionalFetcher),
  "the current institutional trading date must come from the official trading calendar/T86 rather than the lagging FMTQIK history array",
);

const podcastPage = functionBody(files.app, "renderPodcastPage");
const podcastTrackerPage = functionBody(files.app, "renderPodcastTrackerPage");
const podcastUi = `${podcastPage}\n${podcastTrackerPage}`;
check(
  "Podcast UI exposes source update time and stale warning",
  /\b(sourceUpdatedAt|sourceLastUpdatedAt|lastSourceUpdatedAt)\b/.test(podcastUi)
    && /data\?\.stale|data\.stale/.test(podcastUi)
    && /(來源更新|來源最後更新)/.test(podcastUi)
    && /(過期|已逾期|舊資料)/.test(podcastUi),
  "renderPodcastPage/renderPodcastTrackerPage must show a sourceUpdatedAt-style timestamp and a visible stale/expired-data hint when data.stale is true",
);

const podcastLatestHandler = functionBody(files.worker, "handlePodcastLatest");
const podcastEpisodesHandler = functionBody(files.worker, "handlePodcastEpisodes");
check(
  "Podcast database hits return without waiting for upstream requests",
  /readPodcastCache\s*\(/.test(podcastLatestHandler)
    && /return json\(withFreshness\(cached\)\)/.test(podcastLatestHandler)
    && !/isPodcastCacheStaleForSource\s*\(/.test(podcastLatestHandler)
    && /podcastEpisodeCacheKey\s*\(/.test(podcastLatestHandler)
    && /writePodcastCacheByKey\s*\(/.test(podcastLatestHandler)
    && /readPodcastCacheByKey\s*\(/.test(podcastEpisodesHandler)
    && !/fetchPodcastReportsWithInFlight\s*\(/.test(podcastEpisodesHandler)
    && /refreshPodcastCache\s*\(/.test(files.worker)
    && /refreshPodcastEpisodesCache\s*\(/.test(files.worker),
  "latest, episode, and episode-list routes must return cached data immediately and expose explicit refresh helpers",
);

const refresh = files.tpexRefresh;
const hasTempWorkspace = /\bmkdtemp\s*\(|\btemp(?:Dir|Directory|Root)\b|\.tmp\b/i.test(refresh);
const hasDirectorySwap = /\brename\s*\([^,]+,[^)]+\)/.test(refresh);
const stagedWrites = /writeFile\s*\(\s*join\s*\(\s*(?:staged|temp|temporary)\w*\s*,/i.test(refresh);
const swapAfterDownloads = refresh.lastIndexOf("replaceOutputDirectory(") > refresh.search(/\bfor\s*\([^)]*\bof\s+endpoints\b/i);
check(
  "TPEx refresh downloads index and daily-close data before an atomic batch swap",
  /["']tpex_(?:daily_trading_)?index["']/.test(refresh)
    && /["']tpex_mainboard_daily_close_quotes["']/.test(refresh)
    && hasTempWorkspace
    && stagedWrites
    && hasDirectorySwap
    && swapAfterDownloads,
  "refresh-tpex-data.mjs must include a TPEx index dataset and tpex_mainboard_daily_close_quotes, write every endpoint under a temporary workspace, then rename/swap the directory only after the full download loop succeeds",
);

for (const result of checks) {
  if (result.ok) console.log(`[PASS] ${result.name}`);
  else console.error(`[FAIL] ${result.name}\n       ${result.failure}`);
}

const failed = checks.filter((result) => !result.ok);
if (failed.length) {
  console.error(`Data freshness contract failed: ${failed.length}/${checks.length} checks failed.`);
  process.exitCode = 1;
} else {
  console.log(`Data freshness contract verified: ${checks.length}/${checks.length} checks passed.`);
}
