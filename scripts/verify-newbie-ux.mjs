import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const index = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../public/lofi.css", import.meta.url), "utf8");
const stagingCss = readFileSync(new URL("../public/staging-reference.css", import.meta.url), "utf8");
const stagingReference = readFileSync(new URL("../public/staging-reference.js", import.meta.url), "utf8");
const legacyCss = readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");
const vueShell = readFileSync(new URL("../public/vue-shell.js", import.meta.url), "utf8");
const worker = readFileSync(new URL("../src/worker.js", import.meta.url), "utf8");
const manifest = readFileSync(new URL("../public/site.webmanifest", import.meta.url), "utf8");
const podcastEditorial = JSON.parse(readFileSync(new URL("../public/data/podcast-editorial.json", import.meta.url), "utf8"));
const stockSummary = app.slice(app.indexOf("function renderStockTerminalSummary"), app.indexOf("function renderStockMetricMatrix"));
const directStockPage = worker.slice(worker.indexOf("async function serveStockPage"), worker.indexOf("__name(serveStockPage"));
const directPodcastPage = worker.slice(worker.indexOf("async function servePodcastPage"), worker.indexOf("__name(servePodcastPage"));
const directIndustryPage = worker.slice(worker.indexOf("async function serveIndustryPage"), worker.indexOf("__name(serveIndustryPage"));
const retryableError = app.slice(app.indexOf("function showRetryableLoadError"), app.indexOf("function renderPageLoading"));
const setMode = app.slice(app.indexOf("function setMode"), app.indexOf("function bindModeLink"));
const rankingPage = app.slice(app.indexOf("function renderInstitutionalMarketRankingSection"), app.indexOf("const SCREEN_SORT_COLUMNS"));
const institutionalRankingLoader = app.slice(app.indexOf("async function loadInstitutionalRankingRows"), app.indexOf("async function fetchMarginBalance"));
const openApiFinancialCalculator = app.slice(app.indexOf("function calcFinancialFromOpenApiRows"), app.indexOf("function calcFinancialFromMopsBatchItem"));
const mopsFinancialCalculator = app.slice(app.indexOf("function calcFinancialFromMopsBatchItem"), app.indexOf("async function loadMopsBatchFinancialMap"));
const colorMarker = "/* 2026-07-16 unified TWETQ color system */";
const colorLayer = css.slice(css.lastIndexOf(colorMarker));
const seoStyles = worker.slice(worker.indexOf("function buildSeoStyles"), worker.indexOf("__name(buildSeoStyles"));
const seoHead = worker.slice(worker.indexOf("function buildSeoHead"), worker.indexOf("__name(buildSeoHead"));
const layoutMarker = "/* 2026-07-16 proportional TWETQ layout system */";
const layoutLayer = css.slice(css.lastIndexOf(layoutMarker));
const podcastLayoutMarker = "/* 2026-07-20 Podcast-first layout bridge; visual skin stays on the previous editorial system. */";
const podcastLayoutLayer = css.slice(css.lastIndexOf(podcastLayoutMarker));
const seoLayoutMarker = "/* 2026-07-16 proportional SEO layout system */";
const seoLayoutLayer = seoStyles.slice(seoStyles.lastIndexOf(seoLayoutMarker));

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `${name} must exist`);
  const bodyStart = source.indexOf("{", start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`Unable to extract ${name}`);
}

const stripMoneyDjHtmlTest = Function(`"use strict"; ${extractFunction(worker, "stripMoneyDjHtml")}; return stripMoneyDjHtml;`)();
const extractPodcastReportBodyTest = Function(
  "stripMoneyDjHtml",
  `"use strict"; ${extractFunction(worker, "extractPodcastReportBody")}; return extractPodcastReportBody;`,
)(stripMoneyDjHtmlTest);
const testParseNum = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};
const testBands = ["below", "head", "body", "tail", "bone", "crazy", "outlier"].map((key, order) => ({ key, order }));
const benchmarkBandInfoTest = Function("parseNum", "BENCHMARK_BANDS", `"use strict"; ${extractFunction(app, "benchmarkBandInfo")}; return benchmarkBandInfo;`)(testParseNum, testBands);
const medianFiniteTest = Function(`"use strict"; ${extractFunction(app, "medianFinite")}; return medianFinite;`)();
const calcBenchmarkBaseTest = Function(`"use strict"; ${extractFunction(app, "calcBenchmarkBase")}; return calcBenchmarkBase;`)();
const calcMarketTurnoverTest = Function("parseNum", `"use strict"; ${extractFunction(app, "calcMarketTurnover")}; return calcMarketTurnover;`)(testParseNum);
const benchmarkRangesTest = Function("parseNum", "BENCHMARK_BANDS", `"use strict"; ${extractFunction(app, "benchmarkRanges")}; return benchmarkRanges;`)(testParseNum, testBands);
const screenRowMatchesConfigTest = Function(`"use strict"; ${extractFunction(app, "screenRowMatchesConfig")}; return screenRowMatchesConfig;`)();
const buildScreenRowsTest = Function(
  "marketFilterItems",
  "isEtfItem",
  "parseNum",
  "benchmarkBandInfo",
  "benchmarkRanges",
  "screenRowMatchesConfig",
  "SCREEN_EXCLUDE_ETF",
  `"use strict"; ${extractFunction(app, "buildScreenRows")}; return buildScreenRows;`,
)(
  (items) => items,
  () => false,
  testParseNum,
  benchmarkBandInfoTest,
  benchmarkRangesTest,
  screenRowMatchesConfigTest,
  "__exclude_etf__",
);

assert.equal(calcBenchmarkBaseTest(0, 0.1, 0, 0.1), null, "zero net worth cannot create a benchmark");
assert.equal(benchmarkBandInfoTest(0, 100), null, "zero benchmark cannot create a band");
assert.equal(benchmarkBandInfoTest(100, null), null, "missing price cannot create a band");
assert.equal(benchmarkBandInfoTest(100, 1000)?.key, "crazy", "exactly +900% remains inside the documented model boundary");
assert.equal(benchmarkBandInfoTest(100, 1000.01)?.key, "outlier", "values above +900% must leave normal bands");
assert.equal(medianFiniteTest([1, 3, 1000]), 3, "screen summaries must resist an extreme value");
assert.equal(calcMarketTurnoverTest([], new Map()), null, "missing turnover rows cannot become a false zero");
assert.equal(calcMarketTurnoverTest([{ market: "listed", code: "2330" }], new Map([["listed:2330", { value: 25 }]])), 25, "available turnover rows must still sum normally");
const missingBenchmarkStock = [{ market: "listed", code: "2330", name: "台積電", industryName: "半導體" }];
const missingBenchmarkQuotes = new Map([["listed:2330", { close: 100, change: 1, changePct: 1, date: "2026-07-20" }]]);
assert.equal(buildScreenRowsTest(missingBenchmarkStock, missingBenchmarkQuotes, new Map(), { market: "all", industry: "", band: "all", keyword: "" }).length, 0, "default screening must exclude rows without a usable benchmark");
const explicitMissingBenchmarkRows = buildScreenRowsTest(missingBenchmarkStock, missingBenchmarkQuotes, new Map(), { market: "all", industry: "", band: "all", keyword: "2330" });
assert.equal(explicitMissingBenchmarkRows.length, 1, "an explicit stock search must reveal a matching row with missing benchmark inputs");
assert.equal(explicitMissingBenchmarkRows[0].priceBand, "資料不足，暫不判定", "a searched row with missing benchmark inputs must stay neutral");
assert.equal(
  extractPodcastReportBodyTest("<nav>台積電</nav><article><h2>國巨*</h2><p>被動元件</p></article><footer>聯發科</footer>"),
  "國巨* 被動元件",
  "podcast fallback must read only the report article and preserve stock and industry terms",
);

assert.match(app, /baseNetWorth <= 0/, "zero benchmark values must be treated as missing");
assert.match(app, /資料不足，暫不判定/, "missing benchmark data needs a neutral state");
assert.match(app, /renderPageLoading\("市場總覽資料"\)/, "market overview page needs a visible loading state");
assert.match(institutionalRankingLoader, /Promise\.allSettled/, "ranking must tolerate one institutional source failing");
assert.match(institutionalRankingLoader, /listed\.status === "fulfilled"[\s\S]{0,300}otc\.status === "fulfilled"/, "ranking must retain every successful institutional source");
assert.match(app, /renderPageLoading\("選股資料"\)/, "screening page needs a visible loading state");
assert.match(openApiFinancialCalculator, /year:[\s\S]{0,160}quarter:/, "OpenAPI screening financials must retain their reporting period");
assert.match(mopsFinancialCalculator, /year:[\s\S]{0,160}quarter:/, "batch screening financials must retain their reporting period");
assert.match(retryableError, /page-loading[\s\S]{0,120}innerHTML = ""/, "load errors must clear the pending loading state");
assert.doesNotMatch(app, /currentMode === "screen" \? "執行選股"/, "automatic screening must not show a redundant run action");
assert.match(rankingPage, /收盤價；一般股票不含 ETF/, "ranking copy must describe closed-market data correctly");
assert.match(app, /點股票可查看個股/, "ranking rows need an interaction hint");
assert.match(app, /系統依產業分類延伸，非節目直接提及/, "podcast related stocks need an explicit boundary");
assert.match(app, /let podcastView = "episodes"/, "the podcast navigation must open the full episode archive");
assert.match(app, /function loadPodcastEpisodes[\s\S]{0,160}\/api\/podcast\/episodes/, "the archive must use the dedicated episode API");
assert.match(app, /home-podcast-hero[\s\S]{0,2200}home-episode-section[\s\S]{0,2200}home-tools-section/, "the home page must lead with the latest episode, then recent episodes and optional research tools");
assert.match(app, /在 SoundOn 收聽[\s\S]{0,260}在外部音訊服務播放（離開本站）/, "podcast audio links need meaningful source labels");
assert.doesNotMatch(app, /data-export|exportCsv|createObjectURL|revokeObjectURL|\.download\s*=|new Blob\(/i, "the client must not retain first-party download or export mechanisms");
assert.doesNotMatch(stagingReference, /data-export|exportButton/i, "the staging enhancement must not retain export controls");
assert.doesNotMatch(stagingCss, /data-export|section-action-button/i, "the staging stylesheet must not retain export-control styling");
assert.doesNotMatch(app.slice(app.indexOf("function renderPodcastPage"), app.indexOf("function renderPodcastTrackerPage")), /<h2>本集摘要<\/h2>/, "the episode page must not repeat its hero summary");
assert.match(app, /const SCREEN_RESULT_LIMIT = 100/, "screening results need an initial display limit");
assert.match(app, /const allRows = buildScreenRows[\s\S]{0,180}band: "all"/, "screening band counts must use the unfiltered result set");
assert.match(app, /config\.band === "all"\s*\?\s*config\.keyword\s*\?\s*allRows\s*:\s*modelRows/, "an explicit stock search must reveal matching model outliers without adding them to default results");
assert.match(app, /const hasValidModel =[\s\S]{0,500}const explicitSearchFallback = Boolean\(config\.keyword\)/, "explicit searches must retain stocks whose benchmark inputs are missing");
assert.match(app, /priceBand:\s*band\?\.label \|\| "資料不足，暫不判定"/, "screen rows with missing model inputs need a neutral label");
assert.match(app, /!Number\.isFinite\(row\.discountPct\) \? "flat"/, "missing screen benchmark differences must not receive an up or down tone");
assert.doesNotMatch(stockSummary, /支撐|目標|動能/, "unexplained support and target metrics must not appear in the stock summary");
assert.doesNotMatch(app, /通常是先觀察的安全區/, "low valuation must not be described as safe");
assert.doesNotMatch(app, /重新抓最新資料/, "podcast refresh copy must be user-facing");
assert.doesNotMatch(app, /<div class="home-hero-panel">/, "home page must not repeat the same quick-start flow");
assert.match(index, /href="\/"[^>]*data-mode-link="home"[^>]*>最新一集</, "the latest episode must be the first navigation item");
assert.match(index, /href="\/podcast"[^>]*data-mode-link="podcast"[^>]*>所有集數</, "the complete episode archive must be reachable from navigation");
const desktopNav = index.slice(index.indexOf('<nav id="desktopNavBar"'), index.indexOf('</nav>', index.indexOf('<nav id="desktopNavBar"')));
// assert.doesNotMatch(desktopNav, /href="\/about"/, "About must not occupy the desktop top navigation");
// assert.match(index, /id="helpModeButton"[^>]*href="\/about"[^>]*>使用說明與關於本站</, "About must remain reachable from the mobile drawer");
// assert.match(index, /footer-links[\s\S]{0,240}href="\/about"/, "About must remain reachable from the footer");
assert.match(setMode, /\["home", "screen", "market", "institutional", "podcast", "help"/, "help and institutional radar must be accepted as application modes");
assert.match(setMode, /mode === "help"\) renderHelpPage\(\)/, "help route must render its page content");
// assert.equal((app.match(/<header class="service-terms-hero institutional-hero">/g) || []).length, 3, "service, privacy, and disclaimer pages must share the legal-page hero style");
assert.doesNotMatch(index, /href="\/support"|贊助與法務/, "sponsorship navigation must stay removed");
assert.match(index, /本站資料來源為臺灣證券交易所 OpenAPI、櫃買中心 OpenAPI。本站僅供個人學術研究與 Podcast 脈絡整理之非營利加值使用，不保證資料之絕對正確性，亦不構成任何投資建議。/, "the required source and disclaimer notice must appear in the footer");
assert.match(index, /footer-brand[^"]*"><strong>TWETQ<\/strong> Podcast 投資脈絡/, "the footer brand must match the podcast-first identity");
assert.match(index, /id="vueApp"/, "the SPA needs a Vue-managed application root");
assert.match(index, /id="vueShellMount"/, "the SPA needs a CSP-safe Vue mount point");
assert.match(index, /vendor\/vue\.global\.prod\.js\?v=3\.5\.40[\s\S]{0,160}vue-shell\.js[\s\S]{0,220}app\.js/, "the self-hosted Vue runtime and shell must load before the feature engine");
assert.match(vueShell, /Vue\.createApp/, "the shared shell must mount through Vue");
assert.match(vueShell, /render\(\)[\s\S]{0,120}Vue\.h/, "the shared shell must use a CSP-safe render function");
assert.match(vueShell, /twetq:mode-change/, "the Vue shell must follow application route changes");
assert.match(setMode, /dispatchEvent\(new CustomEvent\("twetq:mode-change"/, "the feature engine must notify Vue when routes change");
assert.match(worker, /applicationCategory: "MultimediaApplication"/, "structured data must describe the podcast-first application");
assert.match(worker, /const analysis = payload\?\.analysis \|\| \{\}/, "direct episode pages must read the normalized analysis payload");
assert.match(worker, /"@type": "PodcastEpisode"/, "direct episode pages need PodcastEpisode structured data");
assert.doesNotMatch(directPodcastPage, /readPodcastEditorial\(env\)|editorialIsReviewed|editorialQuestions/, "direct podcast pages must not special-case a reviewed episode");
assert.match(worker, /url\.pathname === "\/api\/podcast\/episodes"/, "the local server must expose the episode archive API");
assert.doesNotMatch(worker, /if \(url\.pathname === "\/api\/podcast\/stocks"\)/, "the legacy public podcast tracker endpoint must be removed");
assert.match(worker, /x-robots-tag", "noindex, nofollow"/, "podcast JSON APIs must not become search result pages");
assert.doesNotMatch(index, /rel="canonical"|adsbygoogle\.js|application\/ld\+json/, "runtime SEO and ads must not be duplicated in the SPA asset");
assert.match(worker, /noindex:\s*true,[\s\S]{0,80}status:\s*404/, "HTML dead ends must return a noindex 404");
assert.match(directPodcastPage, /noindex:\s*true/, "AI podcast pages must stay noindex during staging rollout");
assert.match(worker.slice(worker.indexOf("async function serveSitemapXml"), worker.indexOf("__name(serveSitemapXml")), /readPodcastEditorial[\s\S]{0,700}isPodcastEditorialReviewed\(editorial\)[\s\S]{0,300}pushUrl\(`\/podcast\//, "the sitemap must expose only reviewed podcast analysis");
assert.doesNotMatch(worker.slice(worker.indexOf("async function serveSitemapXml"), worker.indexOf("__name(serveSitemapXml")), /pushUrl\(`\/stock\//, "automated stock data pages must not be mass-submitted in the sitemap");
assert.match(worker.slice(worker.indexOf("async function serveStockPage"), worker.indexOf("__name(serveStockPage")), /noindex:\s*!benchmarkIsUsable/, "incomplete stock data pages must stay noindex");
// assert.match(worker.slice(worker.indexOf("async function serveHomeSpaPage"), worker.indexOf("__name(serveHomeSpaPage")), /const crawlerSummaries = \{[\s\S]{0,3000}"\/about"[\s\S]{0,3000}"\/market"[\s\S]{0,3000}"\/screen"[\s\S]{0,2500}resultSlot/, "indexable SPA routes must expose distinct useful content in the initial HTML");
assert.match(worker.slice(worker.indexOf("async function serveHomeSpaPage"), worker.indexOf("__name(serveHomeSpaPage")), /const crawlerSummaries = \{[\s\S]{0,3000}"\/market"[\s\S]{0,3000}"\/screen"[\s\S]{0,2500}resultSlot/, "indexable SPA routes must expose distinct useful content in the initial HTML");
// assert.match(app, /id="author-azusa"[\s\S]{0,900}作者筆名[\s\S]{0,120}Azusa[\s\S]{0,900}AI 不具作者責任/, "About must identify Azusa and the AI responsibility boundary");
assert.ok(podcastEditorial.episodes["680"], "the previous EP680 editorial may remain archived but must not affect the shared page path");
assert.match(worker, /code: "0050"[\s\S]{0,500}code: "6206"[\s\S]{0,500}code: "2454"/, "podcast stock extraction must recognize EP680's additional Taiwan examples");
assert.match(worker, /reportHtml = await page\.text\(\)[\s\S]{0,300}fillPodcastBodyFromAlternateSource\(found, reportHtml\)/, "podcast analysis must reuse the original report HTML when the transcript backup is not ready");
assert.match(worker, /\.\.\.options\.includeBodyText \? \{ bodyText \} : \{\}/, "full transcripts must only be exposed to internal callers that request them");
assert.match(worker, /function findPodcastReport[\s\S]{0,500}podcastEpisodeNumber\(item\) === Number\(padded\)/, "podcast routes must match the exact episode instead of treating EP1 as EP199");
assert.match(worker, /\.seo-stock-table \{[\s\S]{0,260}display: table !important;[\s\S]{0,260}min-width: 0 !important;[\s\S]{0,260}inline-size: 100% !important;[\s\S]{0,260}table-layout: fixed !important;/, "direct stock tables must fill the card body");
assert.match(directPodcastPage, /fetchPodcastLatestAnalysis\(ep, env, \{ force: false, includeBodyText: true \}\)/, "direct podcast pages must provide every transcript to the shared AI analysis path");
assert.match(worker, /PODCAST_PROFESSIONAL_QUESTIONS = \[[\s\S]{0,800}核心投資命題[\s\S]{0,800}財務表現、估值與資本配置[\s\S]{0,800}主要風險、反方情境[\s\S]{0,800}可量化指標/, "all episodes must use the same six professional research dimensions");
assert.match(worker, /env\.AI\.run\(PODCAST_AI_ANALYSIS_MODEL,[\s\S]{0,2500}questions \u5FC5\u9808\u6070\u597D 6 \u7B46[\s\S]{0,500}<transcript>/, "AzusaQ must use the optional AI provider to generate exactly six transcript-based analyses");
assert.match(worker, /PODCAST_AI_ANALYSIS_CACHE_PREFIX[\s\S]{0,300}sha256Base64\(bodyText\)[\s\S]{0,500}readPodcastCacheByKey/, "AI analyses must reuse the existing content-addressed podcast cache");
assert.match(worker, /function normalizePodcastTaiwanText[\s\S]{0,1800}人工智能[\s\S]{0,1800}industry[\s\S]{0,1000}function normalizePodcastAiAnalysis/, "AI output must be normalized to Taiwan Traditional Chinese in the shared path");
assert.match(worker, /function normalizePodcastAiAnalysis[\s\S]{0,1400}PODCAST_PROFESSIONAL_QUESTIONS\[index\][\s\S]{0,800}answer\.length >= 40[\s\S]{0,800}questions\.length !== 6/, "AI analysis validation must require exactly six usable professional answers");
assert.match(worker, /async function buildPodcastAiOriginalAnalysis[\s\S]{0,1200}attempt < 2/, "invalid model output must be retried once for every episode");
assert.match(directPodcastPage, /buildPodcastAiOriginalAnalysis\(env,[\s\S]{0,700}data-podcast-analysis="ai"/, "every episode, including EP680, must retain the shared published-analysis summary");
assert.equal((directPodcastPage.match(/<span class="seo-kicker">AzusaQ<\/span>/g) || []).length, 1, "the direct podcast template must contain exactly one AzusaQ card");
assert.match(directPodcastPage, /const body = `\s*\$\{analysisBody\}[\s\S]{0,400}\\u6536\\u807D\\u8207\\u4F86\\u6E90/, "the published-analysis summary must render before listening and stock cards");
assert.match(directPodcastPage, /由Azusa發布/, "every AI analysis must show Azusa as the publisher");
assert.doesNotMatch(directPodcastPage, /data-podcast-original-analysis|問：\$\{escapeHtml\(item\?\.question|限制與反面條件|作者與 AI 協作揭露/, "direct episode layouts must omit the six Q&A cards, limitations card, and AI disclosure card");
assert.doesNotMatch(directPodcastPage, /const automatedQuestions|const automatedQaBody|const automatedAnalysisBody|const editorialBody|retellingBody|podcast-retelling-scroll/, "legacy and single-retelling page paths must be removed");
assert.doesNotMatch(directPodcastPage, /授權自動發布|確認發布|待 Azusa 確認發布|人工核准分析為準/, "podcast pages must not expose internal approval wording");
assert.doesNotMatch(directPodcastPage, /Azusa 自問自答/, "podcast headings must use AzusaQ");
assert.match(directPodcastPage, /kicker: "AzusaQ"/, "every published podcast hero must use the AzusaQ label");
assert.match(index, /<html lang="zh-TW">/, "the SPA document must declare Taiwan Traditional Chinese");
assert.match(worker, /<html lang="zh-TW">/, "direct server-rendered pages must declare Taiwan Traditional Chinese");
assert.match(worker, /inLanguage: "zh-TW"/, "structured data must declare Taiwan Traditional Chinese");
// assert.match(worker, /cleanPath === "\/help"[\s\S]{0,160}new URL\("\/about"/, "the old help route must permanently redirect to About");
assert.match(css, /@media \(max-width: 1300px\)[\s\S]{0,220}market-status-strip/, "market summary cards need a responsive desktop breakpoint");
assert.match(css, /\.brand-lockup h1 \{[\s\S]{0,100}display: block !important/, "mobile header must keep the site name visible");
assert.doesNotMatch(rankingPage, /<details|<summary>|rank-disclosure/, "ranking sections must stay expanded after rerenders");

assert.match(app, /即時成交價/, "stock quotes must identify live trade prices");
assert.match(app, /收盤價 · 資料日/, "screening and rankings must identify closing-price dates");
assert.match(app, /資料日較行情早/, "older institutional data needs an inline warning");
assert.match(worker, /contractMonth/, "market index API must expose the futures contract month");
assert.match(worker, /session/, "market index API must expose the futures session");
assert.match(app, /const cards = \[[\s\S]{0,300}\["tx", "台指期日盤"[\s\S]{0,120}\["txAfterHour", "台指期夜盤"/, "the local market cards must use the requested futures day and night sessions");
assert.match(app, /function renderMarketCanvasPulse[\s\S]{0,1800}market-heatmap[\s\S]{0,800}market-flow-card/, "market canvas must keep the heatmap and capital-flow panels together");
assert.match(app, /超出模型可判讀範圍/, "extreme benchmark differences need a neutral state");
assert.match(app, /function medianFinite/, "screen summaries must use a median helper");
assert.doesNotMatch(app, /平均基準差/, "screen summaries must not use the outlier-sensitive average");
assert.match(index, /id="screenKeyword"/, "screening needs a stock code or name filter");
assert.match(app, /href="\/stock\/\$\{encodeURIComponent\(row\.stock\.code\)\}"/, "screening stock names must be real links");
assert.match(app, /function renderSectionNav/, "long research pages need reusable in-page navigation");
assert.doesNotMatch(app, /moneydj|money dj/i, "client assets must not expose MoneyDJ references");
assert.match(app, /id="market-indexes"[\s\S]{0,5000}id="market-stocks"/, "market navigation must point to real result sections");
assert.match(app, /function renderInstitutionalMarketRankingSection[\s\S]{0,3200}id="rank-institutional"/, "institutional ranking section must expose its result anchor");
assert.match(app, /function renderMarketSectorRankingSection[\s\S]{0,2200}id="rank-sectors"/, "sector ranking section must expose its result anchor");
assert.doesNotMatch(rankingPage, /成交金額排行|id="rank-turnover"/, "combined ranking must not render a turnover ranking");
assert.doesNotMatch(rankingPage, /rank-gainers|rank-decliners|個股漲幅與跌幅排行|漲幅排行|跌幅排行|const gainers|const decliners/, "price change ranking content must be removed");
assert.match(rankingPage, /id="rank-institutional" class="market-ranking-parallel"[\s\S]{0,500}買超排行[\s\S]{0,500}賣超排行/, "institutional buy and sell rankings must share a parallel layout");
assert.match(rankingPage, /renderInstitutionalSectorRankingList\("類股淨買賣超排行", sectorRanked\)/, "sector institutional rankings must use one combined ranking");
assert.match(app, /function renderMarketTableCard[\s\S]{0,1900}<table class="market-ranking-table market-ranking-table-\$\{tableVariant\}">[\s\S]{0,800}<ol class="market-mobile-ranking-list"/, "market rankings must use semantic desktop tables and dedicated mobile lists");
assert.match(app, /const TABLE_PAGE_SIZE = 20/, "market and screen tables must share the reviewed twenty-row page size");
assert.match(app, /const MARKET_CANVAS_PAGE_SIZE = 5/, "the local canvas tables must use five-row pages");
assert.match(app, /function renderMarketStockTable[\s\S]{0,900}pageStocks = sortedStocks\.slice/, "market stocks must render one paginated slice");
assert.match(app, /renderMarketCanvasPagination\("market", "個股清單"/, "local market stocks must use numbered canvas pagination");
assert.match(app, /function renderTechnicalScreenTable[\s\S]{0,500}pageRows = sortedRows\.slice[\s\S]{0,2600}renderScreenCanvasPagination\(/, "screen results must render one paginated slice");
assert.match(app, /function rerenderTechnicalScreenTableOnly\(\)[\s\S]{0,300}\[data-table-region="screen"\][\s\S]{0,300}region\.outerHTML = renderTechnicalScreenTable/, "screen pagination must replace the complete table region");
assert.match(app, /function renderMarketCanvasPagination[\s\S]{0,1600}上一頁[\s\S]{0,300}data-market-canvas-page-scope="\$\{scope\}"[\s\S]{0,900}下一頁/, "table pagination must expose previous and next controls");
assert.match(app, /aria-sort="\$\{marketState\.sortKey === key/, "sortable market headers must expose aria-sort");
assert.match(app, /aria-sort="\$\{screenState\.sortKey === key/, "sortable screen headers must expose aria-sort");
assert.match(app, /function renderInstitutionalCanvasRankCard[\s\S]{0,1800}data-bs-toggle="tab"[\s\S]{0,800}tab-pane show active/, "institutional ranking cards must use functional Bootstrap tabs without a blank transition frame");
assert.match(app, /renderInstitutionalExactRankCard\("institutional-exact-total", "三大法人"[\s\S]{0,800}renderInstitutionalExactRankCard\("institutional-exact-foreign", "外資"[\s\S]{0,800}renderInstitutionalExactRankCard\("institutional-exact-trust", "投信"/, "institutional canvas must show the three requested ranking groups");
assert.doesNotMatch(app, /function renderMarketRankingList|tableVariant:\s*"price"/, "removed price ranking renderer and variant must not remain");
assert.match(app, /\["名次", "股票", "產業", "買賣超金額", "買賣超股數"\]/, "institutional rankings must declare matching column labels");
assert.match(app, /\["名次", "類股", "成分股", "買賣超金額", "買賣超股數"\]/, "sector rankings must declare matching column labels");
assert.match(app, /data-ranking-amount="\$\{htmlEscape\(item\.amount\)\}"/, "sector ranking rows must expose their numeric sort value");
assert.match(app, /function renderMarketCanvasSectorCard[\s\S]{0,400}rows\.slice\(start, start \+ MARKET_CANVAS_PAGE_SIZE\)[\s\S]{0,2200}renderMarketCanvasPagination\("sector"/, "sector rankings must show every category through five-row numbered pagination");
assert.match(app, /<tr class="market-canvas-sector-row[^>]+data-rank-industry=[\s\S]{0,500}<button type="button" aria-pressed=/, "the entire local sector row must select its matching detail while retaining a native keyboard button");
assert.match(app, /function renderMarketCanvasSectorDetail[\s\S]{0,700}sortedRows\.slice\(start, start \+ MARKET_CANVAS_PAGE_SIZE\)[\s\S]{0,3000}renderMarketCanvasPagination\("sector-detail"/, "sector details must use an independent five-row numbered pager");
assert.match(app, /function renderMarketCanvasSectorDetail[\s\S]{0,1000}detailSort === "sell"[\s\S]{0,1800}data-market-detail-sort="buy"[\s\S]{0,300}data-market-detail-sort="sell"/, "sector details must support buy and sell ordering");
assert.match(app, /function rerenderMarketCanvasResearchParts[\s\S]{0,900}sectorCard\.outerHTML = renderMarketCanvasSectorCard[\s\S]{0,300}detailCard\.outerHTML = renderMarketCanvasSectorDetail/, "sector and detail pagination must replace only their own canvas cards");
assert.match(app, /marketCanvasRow = rankIndustryRow\.matches\("\.market-canvas-sector-row"\)[\s\S]{0,600}focusRenderedSection\("market-sector-detail"/, "selecting a full sector row must reveal and focus its matching detail without changing pagination behavior");
assert.match(app, /const transcriptHref = currentEp \? `\/podcast\/[\s\S]{0,2600}>查看完整逐字稿<\/a>/, "Podcast transcript links must use the local direct episode transcript on both sites");
assert.match(worker, /const transcript = String\(source\.bodyText \|\| ""\)\.trim\(\)[\s\S]{0,5000}href="#podcast-transcript">查看完整逐字稿[\s\S]{0,800}id="podcast-transcript"/, "local direct Podcast pages must render their cached transcript instead of a dead external link");
assert.match(worker, /if \(!payload\?\.source\?\.bodyText && Number\(payload\?\.source\?\.bodyTextLength\) > 0\)[\s\S]{0,400}includeBodyText: true[\s\S]{0,300}fullPayload\.source\.bodyText/, "local direct Podcast pages must refill transcript text omitted from the summary cache");
assert.doesNotMatch(app, /fallbackPoints/, "local index cards must not synthesize fallback trend points");
assert.match(app, /\(chart\.points\?\.length \|\| 0\) < 3[\s\S]{0,180}盤中走勢資料尚未累積/, "local index cards must explain unavailable trend history");
assert.doesNotMatch(app, /查看完整明細|market-canvas-detail-link/, "the unrequested full-detail control must not remain");
assert.match(stagingCss, /\.market-canvas-sector-card \{[\s\S]{0,160}grid-template-rows:\s*auto auto minmax\(0, 1fr\) auto/, "sector ranking must fill the height of its paired Top 10 card");
assert.match(stagingCss, /\.market-canvas-detail-table\) td:is\([\s\S]{0,200}\.up \{[\s\S]{0,80}var\(--ref-red\)[\s\S]{0,300}\.down \{[\s\S]{0,80}var\(--ref-green\)/, "institutional amount columns must explicitly use red for positive and green for negative values");
assert.doesNotMatch(rankingPage, /splitByNetFlow/, "selected sector stock ranking must not reverse the sell side");
assert.match(app, /<tr data-ranking-amount="\$\{htmlEscape\(item\.amount\)\}">/, "institutional stock ranking rows must expose the exact numeric sort value");
assert.match(css, /\.market-ranking-table \{[\s\S]{0,260}table-layout:\s*auto/, "market ranking tables must size columns from complete field values");
assert.match(stagingCss, /\.market-canvas-research-grid \{[\s\S]{0,220}grid-template-columns:\s*minmax\(0, 1fr\) minmax\(0, 1fr\)/, "sector ranking and capital concentration must share the requested two-column canvas row");
assert.doesNotMatch(rankingPage, /market-overview-panel|market-ranking-panel/, "combined rankings must use the institutional section hierarchy without nested panel wrappers");
assert.match(rankingPage, /id="market-rankings" class="[^"]*institutional-section[^"]*"[\s\S]{0,1400}<div id="rank-institutional"/, "institutional rankings must render directly in the institutional section hierarchy");
assert.doesNotMatch(rankingPage.slice(0, rankingPage.indexOf("function renderMarketSectorRankingSection")), /market-ranking-group/, "institutional rankings must not retain the legacy nested ranking group");
assert.doesNotMatch(rankingPage, /個股漲跌幅/, "price rankings must not add a redundant group heading");
assert.match(app, /function renderMarketCanvasConcentration[\s\S]{0,500}\.slice\(0, 10\)[\s\S]{0,900}資金集中個股 Top 10/, "capital concentration must render and fully expose the top ten stocks");
assert.match(css, /\.market-ranking-table :is\(th, td\)[\s\S]{0,300}text-overflow:\s*clip/, "ranking fields must remain fully readable instead of using ellipsis");
assert.match(stagingCss, /\.market-canvas-table-wrap \{[\s\S]{0,200}max-block-size:\s*none !important[\s\S]{0,100}overflow:\s*visible/, "canvas tables must use numbered pages without nested vertical scrolling");
assert.match(css, /\.paginated-table-wrap[\s\S]{0,220}max-block-size:\s*none !important[\s\S]{0,180}overflow-y:\s*visible !important/, "paginated tables must use page scrolling instead of nested vertical scrolling");
assert.match(css, /@media \(max-width: 45rem\)[\s\S]{0,8000}\.market-ranking-table-wrap \{\s*display:\s*none;[\s\S]{0,300}\.market-mobile-ranking-list \{[\s\S]{0,100}display:\s*block/, "market rankings must switch to compact lists on phones");
assert.doesNotMatch(app, /renderFundFlowPanel|renderSectorMoves|id="market-flow"|id="market-sectors"|資金流向與類股漲跌/, "removed market insight panels must not remain in the client");
assert.match(app, /id="stock-quote"/, "stock quote needs a direct anchor");
assert.match(app, /id="stock-summary"/, "stock completeness summary needs a direct anchor");
assert.match(app, /researchResultStatus[\s\S]{0,120}role="status"/, "research rerenders need an assistive status announcement");
assert.match(app, /一般股票，不含 ETF/, "ranking scope must state that ETFs are excluded");
assert.equal((index.match(/data-research-nav/g) || []).length, 3, "desktop navigation must expose market, institutional radar, and screening pages");
assert.match(index, /href="\/market"[^>]*data-research-nav[\s\S]{0,300}href="\/institutional"[^>]*data-research-nav[\s\S]{0,300}href="\/screen"[^>]*data-research-nav/, "market, institutional radar, and screening pages must stay expanded in navigation order");
assert.doesNotMatch(index, /href="\/stock"[^>]*data-research-nav|href="\/rank"[^>]*data-research-nav/, "removed research pages must not remain in navigation");
assert.doesNotMatch(index, /desktop-research-menu|desktop-research-links/, "research pages must not be combined in a dropdown");
assert.match(app, /section-nav a\[href\^="#"\][\s\S]{0,240}focusRenderedSection/, "research section shortcuts must use the shared focus and scroll behavior");
// assert.match(index, /使用說明與關於本站/, "the retained help links must match their instructional purpose");
assert.match(app, /找到 \$\{filteredCount\.toLocaleString\("zh-TW"\)\} 集，共收錄/, "podcast result counts need explicit labels");
assert.match(app, /名稱資料缺漏/, "podcast related stocks must expose missing names");
assert.match(app, /在外部音訊服務播放（離開本站）/, "MP3 links must describe their destination");
assert.match(worker, /在外部音訊服務播放（離開本站）/, "direct podcast MP3 links must describe their destination");
assert.match(worker, /tokens\.css\?v=20260726-mobile-style-v1/, "direct pages must load the current design tokens");
assert.match(worker, /lofi\.css\?v=20260905-free-site-v1/, "direct pages must load the shared site stylesheet");
assert.match(worker, /data-twetq-inline="tokens"[\s\S]{0,600}data-twetq-inline="site"/, "SPA pages must inline their critical styles");
assert.match(worker, /data-twetq-inline="shell"[\s\S]{0,600}data-twetq-inline="app"/, "SPA pages must inline their critical scripts");
assert.match(worker, /<header class="app-header">[\s\S]{0,1800}data-research-nav|<header class="app-header">/, "direct pages must reuse the shared header shell");
assert.match(worker, /<footer class="footer-note[^"]*">/, "direct pages must reuse the shared footer shell");
assert.match(vueShell, /shellRoot\.id === "vueSeoApp"[\s\S]{0,1800}site-nav-open/, "direct pages need the shared mobile navigation behavior");
assert.match(directPodcastPage, /const directStocks =/, "direct podcast pages must establish a direct-mention list");
assert.match(directPodcastPage, /readMarketSnapshotCache\(env\)[\s\S]{0,700}marketStockNameByCode/, "direct podcast pages must resolve stock names from the cached official market snapshot");
assert.match(directPodcastPage, /resolvePodcastStockName\(code,[\s\S]{0,800}resolvePodcastStockName\(code,/, "direct podcast pages must resolve names for both direct and industry-related stocks");
assert.match(directPodcastPage, /<details class="seo-related-details">/, "direct podcast industry extensions must start collapsed");
assert.match(directPodcastPage, /系統依產業分類延伸，非節目直接提及/, "direct podcast pages must label system extensions explicitly");
assert.match(directPodcastPage, /名稱資料缺漏/, "direct podcast pages must expose missing related-stock names");
assert.doesNotMatch(directPodcastPage, /內容提及\$\{escapeHtml\(item\.name\)\}/, "system industry extensions must not be presented as episode mentions");
assert.match(directStockPage, /const benchmarkIsUsable =/, "direct stock pages must validate benchmark inputs before display");
assert.match(directStockPage, /收盤價/, "direct stock pages must identify the price type");
assert.match(directStockPage, /資料不足，暫不判定/, "direct stock pages need a neutral state for invalid benchmarks");
assert.match(app, /所有公開內容與研究功能均不以付款、會員等級或登入狀態作為解鎖條件/, "all public features must remain available without payment or login");
assert.doesNotMatch(app, /如何取消續扣|PAYUNi|payuni\.com\.tw|payment\.opay\.tw|歐付寶會員編號|1558355/, "removed payment paths and account details must stay absent");
assert.match(app, /beginnerPodcastExcerpt[\s\S]{0,500}CAPEX（資本支出）[\s\S]{0,500}MLCC（積層陶瓷電容）/, "home podcast copy must expand specialist abbreviations");
assert.match(app, /getNearbyStocks[\s\S]{0,1200}textEditDistance/, "misspelled stock names need nearby suggestions");
assert.match(app, /targetCandidate[\s\S]{0,180}targetCandidate > stopBase/, "invalid target and support ordering must not be rendered as a conclusion");
assert.match(app, /資料不足：\$\{missingReasons\.join/, "stock completeness must identify concrete missing fields");
assert.doesNotMatch(app, /renderDataSourceNote|CARD_SOURCE_RULES|annotateCardSources|card-source-note|renderPodcastNotice|institutional-sources/, "visible source fields and their shared injector must be removed");
assert.doesNotMatch(worker, /<span class="seo-note">資料來源：<\/span>|資料來源與限制/, "direct pages must not render source fields");
assert.doesNotMatch(directIndustryPage, /MoneyDJ/, "industry pages must not expose the MoneyDJ attribution in visible copy");
assert.match(directIndustryPage, /\\u516C\\u958B\\u7522\\u696D\\u5206\\u985E|公開產業分類/, "industry pages must retain a neutral classification description");
assert.doesNotMatch(worker, /\\u8CC7\\u6599\\u4F86\\u6E90/i, "direct pages must not render escaped source-field labels");
assert.doesNotMatch(css, /\.source-note\b|\.card-source-note\b|\.institutional-sources\b/, "the active stylesheet must not retain source-field selectors");
assert.doesNotMatch(legacyCss, /\.source-note\b|\.card-source-note\b|\.institutional-sources\b/, "the legacy stylesheet must not retain source-field selectors");
assert.match(app, /function renderPageStrip[\s\S]{0,500}page-strip institutional-hero[\s\S]{0,300}institutional-kicker[\s\S]{0,300}<h1>/, "shared page strips must use the institutional radar hero hierarchy");
assert.match(css, /institutional radar site-wide visual baseline[\s\S]{0,1600}\.home-hero[\s\S]{0,1600}\.service-terms-hero/, "all SPA page families must share the institutional radar visual baseline");
assert.match(css, /institutional radar site-wide visual baseline[\s\S]{0,5200}\.section-nav/, "all SPA section navigation must share the institutional radar navigation language");
assert.match(css, /#seoMain\.seo-shell > \.seo-card:first-child[\s\S]{0,500}background:[^;]*linear-gradient[^;]*!important/, "direct page heroes must override the legacy card surface rule");
assert.match(seoStyles, /Institutional radar visual baseline for direct-rendered pages[\s\S]{0,800}\.seo-shell > \.seo-card:first-child/, "direct-rendered pages must share the institutional radar hero language");
assert.doesNotMatch(app.slice(app.indexOf("const HELP_PAGE_SECTIONS"), app.indexOf("const HELP_QUICK_START")), /魚頭|魚身|魚尾|魚骨|瘋狂區/, "beginner help must use neutral benchmark ranges");
assert.match(app, /function renderHelpText[\s\S]{0,700}\["市場總覽", "\/market"\][\s\S]{0,300}\["法人籌碼", "\/institutional"\][\s\S]{0,300}\["選股", "\/screen"\]/, "help steps must link to the labels they describe");
assert.match(index, /role="dialog"[\s\S]{0,120}aria-modal="true"/, "the mobile drawer needs modal dialog semantics");
assert.match(app, /function trapSiteNavFocus/, "the mobile drawer must trap keyboard focus");
assert.match(app, /navCloseButton\?\.focus\(\)/, "opening the mobile drawer must move focus inside");
assert.match(app, /navToggleButton\?\.focus\(\)/, "closing the mobile drawer must restore focus");
assert.match(css, /body\.site-nav-open[\s\S]{0,160}overflow:\s*hidden/, "the open mobile drawer must lock background scrolling");
assert.match(layoutLayer, /\.screen-change-group \{[\s\S]{0,80}display:\s*none[\s\S]{0,5000}@media \(max-width: 61\.25rem\)[\s\S]{0,1800}\.screen-change-group \{[\s\S]{0,80}display:\s*grid/, "desktop and mobile must expose only one benchmark band control");
assert.match(layoutLayer, /body\[data-mode="stock"\] #resultSlot \.terminal-quote-grid[\s\S]{0,100}repeat\(2,\s*minmax\(0,\s*1fr\)\)/, "mobile stock OHLC values must use a two-by-two grid");

assert.ok(colorLayer.startsWith(colorMarker), "the canonical color layer must remain the final CSS authority");
for (const [token, value] of [
  ["editorial-bg", "#f1f0eb"],
  ["editorial-paper", "#fffefa"],
  ["editorial-ink", "#182735"],
  ["editorial-muted", "#59666f"],
  ["editorial-border", "#7e8987"],
  ["editorial-nav", "#20313d"],
  ["editorial-accent", "#2f716e"],
  ["editorial-focus", "#b56f2d"],
  ["editorial-up", "#b43a3a"],
  ["editorial-down", "#247148"],
]) {
  assert.match(colorLayer, new RegExp(`--${token}:\\s*${value}`, "i"), `${token} must use the approved palette`);
}
assert.match(colorLayer, /body\[data-mode\][\s\S]{0,180}body\[data-mode\] \.app/, "every application route needs the shared canvas");
assert.doesNotMatch(colorLayer, /#2962ff\b|var\(\s*--blue\s*\)/i, "the canonical layer must not fall back to the legacy blue theme");
assert.match(seoStyles, /--accent:\s*#2f716e/i, "direct SEO pages must use the same primary color");
assert.doesNotMatch(seoStyles, /#b8954f|#ddb26b|#3e6eb1/i, "direct SEO pages must not retain the beige and blue legacy palette");
assert.equal((seoHead.match(/name="theme-color"/g) || []).length, 1, "runtime SEO needs one browser theme color");
assert.match(seoHead, /name="theme-color" content="#20313d"/, "the browser chrome must match the navy navigation");
assert.match(manifest, /"background_color": "#f1f0eb"[\s\S]{0,80}"theme_color": "#20313d"/, "the installable app must share the website palette");

assert.ok(layoutLayer.startsWith(layoutMarker), "the proportional layout layer must remain the final CSS authority");
assert.match(layoutLayer, /--page-gutter:\s*clamp\(/, "page gutters must scale with the viewport");
assert.match(layoutLayer, /--text-body:\s*clamp\(/, "body typography must use a fluid scale");
assert.match(layoutLayer, /--radius-card:\s*clamp\(/, "card radii must use the shared fluid scale");
assert.match(layoutLayer, /repeat\(auto-fit,\s*minmax\(min\(100%,/, "responsive grids must derive their columns from available width");
assert.doesNotMatch(layoutLayer, /\b\d+(?:\.\d+)?px\b/i, "the proportional layout authority must not hard-code visible geometry in pixels");
assert.match(layoutLayer, /\.shell > :is\([\s\S]{0,120}#resultSlot[\s\S]{0,160}inline-size:\s*100% !important/, "shell content must align to one shared proportional gutter");
assert.match(layoutLayer, /\.lightweight-kline-chart \{[\s\S]{0,120}block-size:\s*100% !important/, "the rendered K-line chart must match its proportional shell");
assert.match(layoutLayer, /\.market-table-card > header[\s\S]{0,220}align-items:\s*center/, "market ranking cards must use the shared table header layout");
assert.match(layoutLayer, /body\[data-mode="rank"\] #resultSlot \.market-ranking-grid-1[\s\S]{0,120}grid-template-columns:\s*minmax\(0,\s*1fr\)/, "single ranking groups must keep their full container width");
assert.match(layoutLayer, /body\[data-mode="rank"\] #resultSlot \.market-ranking-columns[\s\S]{0,150}min\(100%,\s*29\.5rem\)/, "ranking columns must wrap from their available container width");
assert.match(layoutLayer, /body\[data-mode="stock"\] #resultSlot \.financial-metric-list,[\s\S]{0,180}min\(100%,\s*28rem\)/, "financial rows must reserve enough proportional width for formulas");
assert.match(layoutLayer, /body\[data-mode="stock"\] #resultSlot \.financial-metric-row[\s\S]{0,180}min\(100%,\s*12rem\)/, "financial labels and formulas must reflow from each card's own width");
assert.match(layoutLayer, /body\[data-mode="help"\] #resultSlot \.help-section-grid[\s\S]{0,180}min\(100%,\s*28rem\)/, "help cards must avoid an unused third track");
assert.match(layoutLayer, /#resultSlot \.metric-card \.metric-tag[\s\S]{0,220}color:\s*var\(--editorial-accent\) !important/, "metric tags must retain readable unified contrast");
assert.match(index, /<body data-mode="home">/, "the homepage design layer must not depend on JavaScript startup");
assert.match(index, /tokens\.css\?v=20260726-mobile-style-v1/, "mobile clients need a fresh design-token cache key");
assert.match(index, /lofi\.css\?v=20260905-free-site-v1/, "mobile clients need a fresh stylesheet cache key");
assert.match(index, /app\.js\?v=20260905-free-site-v1/, "mobile clients need a fresh application script cache key");
assert.ok(podcastLayoutLayer.startsWith(podcastLayoutMarker), "the Podcast layout bridge must stay explicit");
assert.match(podcastLayoutLayer, /home-dashboard\.home-podcast-dashboard[\s\S]{0,160}grid-template-columns:\s*minmax\(0,\s*1fr\)/, "the previous skin must not restore the removed home sidebar gap");
assert.match(podcastLayoutLayer, /home-episode-list,\s*\.home-tool-links\)[\s\S]{0,180}grid-template-columns:\s*minmax\(0,\s*1fr\)/, "home content must reuse the previous editorial row rhythm");
assert.match(podcastLayoutLayer, /\.home-episode-link \.journey-index[\s\S]{0,220}white-space:\s*nowrap/, "long EP labels must not wrap inside the previous square marker");
assert.doesNotMatch(podcastLayoutLayer, /home-episode-section[\s\S]{0,240}(?:background|box-shadow):/, "the layout bridge must not replace the previous section skin");
assert.ok(seoLayoutLayer.startsWith(seoLayoutMarker), "direct SEO pages need the same proportional layout authority");
assert.match(seoLayoutLayer, /--seo-gutter:\s*clamp\(/, "direct SEO page gutters must be fluid");
assert.doesNotMatch(seoLayoutLayer, /\b\d+(?:\.\d+)?px\b/i, "the proportional SEO authority must not hard-code visible geometry in pixels");
assert.match(seoLayoutLayer, /\.seo-hero \{[\s\S]{0,80}grid-template-columns:\s*1fr/, "direct page metrics need the full hero width");
assert.match(seoLayoutLayer, /\.seo-hero \.seo-metrics \{[\s\S]{0,120}repeat\(4,\s*minmax\(0,\s*1fr\)\)/, "direct page metrics must share one desktop row");
assert.match(seoLayoutLayer, /\.seo-industry-table \{[\s\S]{0,120}display:\s*table;[\s\S]{0,80}table-layout:\s*fixed/, "industry tables must fill their desktop card");
assert.match(seoLayoutLayer, /\.seo-footer-inner \{[\s\S]{0,180}white-space:\s*nowrap/, "direct pages must preserve a one-line footer");
assert.match(worker, /id="vueSeoApp"[\s\S]{0,5000}vendor\/vue\.global\.prod\.js/, "direct SEO pages need the shared Vue shell");
assert.match(layoutLayer, /body\[data-mode="screen"\] #screenControls\.screen-controls-simple[\s\S]{0,180}repeat\(2,\s*minmax\(0,\s*1fr\)\)/, "mobile screening controls must use available width without excessive vertical gaps");
assert.match(app, /height:\s*shell\.clientHeight\s*\|\|\s*Math\.round\(width \* 9 \/ 16\)/, "the K-line chart must follow its responsive container ratio");
assert.doesNotMatch(app, /Math\.max\(380,\s*shell\.clientHeight/, "the K-line chart must not retain a fixed pixel fallback");

console.log("newbie UX checks passed");
