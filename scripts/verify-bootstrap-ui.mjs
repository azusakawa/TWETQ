import { readFile } from "node:fs/promises";

const [html, loader, adapter, worker, scss, compiledCss, serviceWorker, app, referenceCss, referenceJs, cover] = await Promise.all([
  readFile(new URL("../public/index.html", import.meta.url), "utf8"),
  readFile(new URL("../public/bootstrap-loader.js", import.meta.url), "utf8"),
  readFile(new URL("../public/bootstrap-adapter.js", import.meta.url), "utf8"),
  readFile(new URL("../src/worker.js", import.meta.url), "utf8"),
  readFile(new URL("../styles/bootstrap-twetq.scss", import.meta.url), "utf8"),
  readFile(new URL("../public/vendor/bootstrap-twetq.min.css", import.meta.url), "utf8"),
  readFile(new URL("../public/sw.js", import.meta.url), "utf8"),
  readFile(new URL("../public/app.js", import.meta.url), "utf8"),
  readFile(new URL("../public/staging-reference.css", import.meta.url), "utf8"),
  readFile(new URL("../public/staging-reference.js", import.meta.url), "utf8"),
  readFile(new URL("../public/assets/podcast-cover.svg", import.meta.url), "utf8"),
]);

const checks = [
  [loader.includes('document.documentElement.classList.add("bootstrap-ui")') && adapter.includes('const add =') && !loader.includes("location.hostname") && !adapter.includes("location.hostname"), "Bootstrap UI is enabled by the local runtime"],
  [html.includes("/vendor/bootstrap-twetq.min.css?v=20260819-bootstrap-production-v1"), "custom Bootstrap Sass build is loaded locally"],
  [loader.includes("/vendor/bootstrap.bundle.min.js?v=5.3.8"), "Bootstrap bundle is loaded locally"],
  [html.includes("/tokens.css") && html.includes("/lofi.css") && !loader.includes("disableLegacyStyles"), "local runtime retains the existing layout styles"],
  [scss.includes("$grid-breakpoints") && scss.includes("61.3125rem") && scss.includes("--twetq-page-max: 80rem") && scss.includes("body[data-mode] .twetq-footer-row.container-fluid"), "existing geometry is encoded in Bootstrap Sass"],
  [compiledCss.includes(".twetq-shell.container-fluid") && compiledCss.includes(".twetq-header.navbar") && compiledCss.includes(".twetq-footer-row.container-fluid"), "Bootstrap geometry components are compiled"],
  [adapter.includes('add(document, ".shell", "container-fluid", "twetq-shell")'), "shared shell uses the Bootstrap container"],
  [adapter.includes('add(document, ".app-header", "navbar", "navbar-expand-xl", "twetq-header")'), "shared header uses the Bootstrap navbar"],
  [adapter.includes('add(document, ".footer-note", "twetq-footer", "border-top")') && adapter.includes('"flex-column", "flex-xl-row"'), "shared footer geometry uses Bootstrap Sass and responsive utilities"],
  [serviceWorker.includes("/vendor/bootstrap-twetq.min.css?v=20260819-bootstrap-production-v1") && serviceWorker.includes("/bootstrap-adapter.js?v=20260905-free-site-v1"), "mobile app shell caches the Bootstrap geometry assets"],
  [loader.includes('document.documentElement.classList.add("staging-reference-ui")') && loader.includes("/staging-reference.css?v=20260905-free-site-v1") && loader.includes("/staging-reference.js?v=20260905-free-site-v1") && !html.includes("/staging-reference.css"), "reference redesign is enabled by the local loader"],
  [referenceCss.includes(".staging-reference-ui") && referenceCss.includes(".staging-mobile-nav") && referenceCss.includes(".staging-direct-podcast") && referenceCss.includes("Stock canvas v3") && referenceCss.includes("All episodes canvas v2") && referenceCss.includes("Institutional canvas v3") && referenceCss.includes("Canvas v56") && referenceCss.includes("Direct industry mobile canvas") && referenceJs.includes("length === 5") && referenceJs.includes('href="/industry/${encodeURIComponent(categoryCode)}"') && !referenceJs.includes("stagingResearchTools") && !referenceJs.includes("data-staging-research-toggle") && !referenceJs.includes("data-staging-more") && !referenceJs.includes("贊助法務") && referenceJs.includes("Array.from({ length: 4 }") && referenceJs.includes('fetch("/api/market/snapshot")') && referenceJs.includes("staging-screen-result-tools") && referenceJs.includes("staging-terms-mobile-bar") && app.includes("renderInstitutionalExactCanvasPage") && app.includes("institutional-chart-bar") && app.includes("夜盤未平倉") && app.includes("renderScreenCanvasPagination") && app.includes("institutional-streak") && worker.includes("institutional-radar-v4") && worker.includes("futContractsDateAhDown") && !referenceJs.includes('href="/portfolio"') && !referenceJs.includes('href="/support"') && serviceWorker.includes("/staging-reference.css?v=20260905-free-site-v1") && serviceWorker.includes("/staging-reference.js?v=20260905-free-site-v1"), "staging canvas implementation and mobile assets are complete and cached"],
  [worker.includes('["/warrant", "/warrant/strategy", "/futures", "/portfolio", "/guide"].includes(cleanPath)') && !referenceJs.includes('["help", "/about"') && !referenceJs.includes('href="/warrant"'), "legacy routes stay out of local routing and navigation"],
  [referenceJs.includes("bootstrap.Offcanvas.getOrCreateInstance") && referenceJs.includes("bootstrap.ScrollSpy.getOrCreateInstance"), "local navigation and legal pages use Bootstrap JS components"],
  [app.includes('class="screen-band-filter"') && app.includes("renderScreenBandQuickFilters(config, bandCounts)") && (app.match(/data-screen-band=/g) || []).length >= 1, "screen canvas renders the grouped interval filter through the existing interaction path"],
  [referenceJs.includes("staging-terms-toolbar") && !referenceJs.includes("staging-support-illustration") && referenceJs.includes("updateTermsProgress") && referenceCss.includes("Canvas v38"), "legal canvases include desktop and mobile enhancements"],
  [cover.includes("TWETQ Podcast") && serviceWorker.includes("/assets/podcast-cover.svg"), "podcast cover asset is present and cached"],
  [app.includes("footerTop >= window.innerHeight"), "back-to-top control does not cover the footer"],
  [adapter.includes("new MutationObserver"), "dynamic page renders are enhanced"],
  [adapter.includes('add(root, "table", "table")'), "tables use Bootstrap classes"],
  [adapter.includes(".seo-card"), "server-rendered detail pages use Bootstrap cards"],
  [adapter.includes("syncActiveNavigation") && adapter.includes('classList.remove("bg-primary")'), "header active state follows the current page"],
  [!adapter.includes('"carousel", "slide"'), "marquee retains the existing animation contract"],
  [!html.includes("bootstrap-app.css") && !loader.includes("bootstrap-app.css") && !worker.includes("bootstrap-app.css"), "obsolete Bootstrap override CSS stays removed"],
  [worker.includes("<style>${buildSeoStyles()}</style>"), "server-rendered pages retain the production layout styles"],
];

for (const [ok, label] of checks) {
  if (!ok) throw new Error(`Bootstrap UI check failed: ${label}`);
  console.log(`[PASS] ${label}`);
}
