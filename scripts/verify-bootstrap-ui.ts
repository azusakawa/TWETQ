/**
 * Verify Bootstrap UI - TypeScript 版本
 * 验证 Bootstrap UI 是否正确配置
 */

import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

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

// 验证检查
const checks: [string, boolean][] = [
  ["Bootstrap UI is enabled by the local runtime", loader.includes('document.documentElement.classList.add("bootstrap-ui")') && adapter.includes('const add =') && !loader.includes("location.hostname") && !adapter.includes("location.hostname")],
  ["custom Bootstrap Sass build is loaded locally", html.includes("/vendor/bootstrap-twetq.min.css?v=20260819-bootstrap-production-v1")],
  ["Bootstrap bundle is loaded locally", loader.includes("/vendor/bootstrap.bundle.min.js?v=5.3.8")],
  ["local runtime retains the existing layout styles", html.includes("/tokens.css") && html.includes("/lofi.css") && !loader.includes("disableLegacyStyles")],
  ["existing geometry is encoded in Bootstrap Sass", scss.includes("$grid-breakpoints") && scss.includes("61.3125rem") && scss.includes("--twetq-page-max: 80rem") && scss.includes("body[data-mode] .twetq-footer-row.container-fluid")],
  ["Bootstrap geometry components are compiled", compiledCss.includes(".twetq-shell.container-fluid") && compiledCss.includes(".twetq-header.navbar") && compiledCss.includes(".twetq-footer-row.container-fluid")],
  ["shared shell uses the Bootstrap container", adapter.includes('add(document, ".shell", "container-fluid", "twetq-shell")')],
  ["shared header uses the Bootstrap navbar", adapter.includes('add(document, ".app-header", "navbar", "navbar-expand-xl", "twetq-header")')],
  ["shared footer geometry uses Bootstrap Sass and responsive utilities", adapter.includes('add(document, ".footer-note", "twetq-footer", "border-top")') && adapter.includes('"flex-column", "flex-xl-row"')],
  ["mobile app shell caches the Bootstrap geometry assets", serviceWorker.includes("/vendor/bootstrap-twetq.min.css?v=20260819-bootstrap-production-v1") && serviceWorker.includes("/bootstrap-adapter.js?v=20260905-free-site-v1")],
  ["reference redesign is enabled by the local loader", loader.includes('document.documentElement.classList.add("staging-reference-ui")') && loader.includes("/staging-reference.css?v=20260905-free-site-v1") && loader.includes("/staging-reference.js?v=20260905-free-site-v1") && !html.includes("/staging-reference.css")],
  ["staging canvas implementation and mobile assets are complete and cached", referenceCss.includes(".staging-reference-ui") && referenceCss.includes(".staging-mobile-nav") && referenceCss.includes(".staging-direct-podcast") && referenceJs.includes("length === 5") && referenceJs.includes('href="/industry/${encodeURIComponent(categoryCode)}"') && !referenceJs.includes("stagingResearchTools") && !referenceJs.includes("data-staging-research-toggle") && !referenceJs.includes("data-staging-more") && !referenceJs.includes("贊助法\\?") && referenceJs.includes("Array.from({ length: 4 }") && referenceJs.includes('fetch("/api/market/snapshot")') && referenceJs.includes("staging-screen-result-tools") && referenceJs.includes("staging-terms-mobile-bar") && app.includes("renderInstitutionalExactCanvasPage") && app.includes("institutional-chart-bar") && app.includes("夜盤\\?") && app.includes("renderScreenCanvasPagination") && app.includes("institutional-streak") && worker.includes("institutional-radar-v4") && worker.includes("futContractsDateAhDown") && !referenceJs.includes('href="/portfolio"') && !referenceJs.includes('href="/support"') && serviceWorker.includes("/staging-reference.css?v=20260905-free-site-v1") && serviceWorker.includes("/staging-reference.js?v=20260905-free-site-v1")],
  ["legacy routes stay out of local routing and navigation", worker.includes('["/warrant", "/warrant/strategy", "/futures", "/portfolio", "/guide"].includes(cleanPath)') && !referenceJs.includes('["help", "/about"') && !referenceJs.includes('href="/warrant"')]
];

let passed = 0;
let failed = 0;

for (const [name, condition] of checks) {
  if (condition) {
    console.log(`PASS: ${name}`);
    passed++;
  } else {
    console.log(`FAIL: ${name}`);
    failed++;
  }
}

console.log(`\nBootstrap UI verification: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error("Bootstrap UI verification failed");
  process.exitCode = 1;
} else {
  console.log("Bootstrap UI verification passed");
}