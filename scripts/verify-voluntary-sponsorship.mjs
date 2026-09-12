import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const index = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const reference = readFileSync(new URL("../public/staging-reference.js", import.meta.url), "utf8");
const worker = readFileSync(new URL("../src/worker.js", import.meta.url), "utf8");
const footerNotice = "本站資料來源為臺灣證券交易所 OpenAPI、櫃買中心 OpenAPI。本站僅供個人學術研究與 Podcast 脈絡整理之非營利加值使用，不保證資料之絕對正確性，亦不構成任何投資建議。";
const forbiddenPayment = /payment\.opay\.tw|PAYUNi|payuni\.com\.tw|歐付寶會員編號|1558355|data-support-plan|前往付款|銀行帳號|銀行轉帳|LINE Pay 帳號|街口帳號/;

for (const [name, source] of Object.entries({ app, index, reference, worker })) {
  assert.doesNotMatch(source, forbiddenPayment, `${name} still contains a payment destination or account`);
}
assert.doesNotMatch(index, /href="\/support"|brand-sponsor-marquee|贊助與法務/, "public shell still links to sponsorship");
assert.doesNotMatch(reference, /href="\/support"|贊助法務|贊助與法務|付款前確認/, "reference shell still links to sponsorship");
assert.match(worker, /cleanPath === "\/support"[\s\S]{0,160}Response\.redirect\(new URL\("\/", request\.url\), 302\)/, "/support no longer redirects home");
assert.match(app, /const transcriptHref = currentEp \? `\/podcast\//, "Podcast transcript links are not local and public");
assert.match(app, /所有公開內容與研究功能均不以付款、會員等級或登入狀態作為解鎖條件/, "free-access contract is missing");
assert.ok(index.includes(footerNotice) && worker.includes(footerNotice), "required footer notice is not present in both shells");

console.log("free public-access checks passed");
