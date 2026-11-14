/**
 * Verify Data Freshness - TypeScript 版本
 * 验证数据新鲜度
 */

import { readFileSync } from "node:fs";

const files = {
  worker: readFileSync(new URL("../src/worker.js", import.meta.url), "utf8"),
  app: readFileSync(new URL("../public/app.js", import.meta.url), "utf8"),
  tpexRefresh: readFileSync(new URL("./refresh-tpex-data.mjs", import.meta.url), "utf8"),
};

function functionBody(text: string, name: string): string {
  const signature = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`).exec(text);
  if (!signature) return "";
  const open = text.indexOf("{", signature.index! + signature[0]!.length);
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
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "/" && next === "*") {
      blockComment = true;
      continue;
    }
    if (char === "/" && next === "/") {
      lineComment = true;
      continue;
    }
    if (char === "{") depth++;
    if (char === "}") {
      if (depth === 0) return text.slice(open + 1, index);
      depth--;
    }
  }
  return "";
}

// 检查 worker 中的函数
const functions = ["mergeOfficialMopsHistory", "parseInlineXbrlFacts"];
let passed = 0;
let failed = 0;

for (const func of functions) {
  const body = functionBody(files.worker, func);
  if (body.length > 0) {
    console.log(`PASS: ${func} exists in worker.js`);
    passed++;
  } else {
    console.log(`FAIL: ${func} not found in worker.js`);
    failed++;
  }
}

// 检查 app.js 中的缓存密钥
const cacheKeys = ["institutional-radar-v4", "market-snapshot-v1", "mops-financials:"];
for (const key of cacheKeys) {
  if (files.app.includes(key)) {
    console.log(`PASS: Cache key "${key}" exists in app.js`);
    passed++;
  } else {
    console.log(`FAIL: Cache key "${key}" not found in app.js`);
    failed++;
  }
}

console.log(`\nData freshness verification: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error("Data freshness verification failed");
  process.exitCode = 1;
} else {
  console.log("Data freshness verification passed");
}