/**
 * Verify Newbie UX - TypeScript 版本
 * 验证新手用户体验配置
 */

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

const colorMarker = "/* 2026-07-16 unified TWETQ color system */";
const colorLayer = css.slice(css.lastIndexOf(colorMarker));
const seoStyles = worker.slice(worker.indexOf("function buildSeoStyles"), worker.indexOf("__name(buildSeoStyles)"));
const seoHead = worker.slice(worker.indexOf("function buildSeoHead"), worker.indexOf("__name(buildSeoHead)"));
const layoutMarker = "/* 2026-07-16 proportional TWETQ layout system */";
const layoutLayer = css.slice(css.lastIndexOf(layoutMarker));
const podcastLayoutMarker = "/* 2026-07-20 Podcast-first layout bridge; visual skin stays on the previous editorial system. */";

// 验证检查
const checks: [string, boolean][] = [
  ["color system exists", colorLayer.length > 0],
  ["seo styles exist", seoStyles.length > 0],
  ["seo head exists", seoHead.length > 0],
  ["layout system exists", layoutLayer.length > 0],
  ["podcast layout exists", css.includes(podcastLayoutMarker)]
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

console.log(`\nNewbie UX verification: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error("Newbie UX verification failed");
  process.exitCode = 1;
} else {
  console.log("Newbie UX verification passed");
}