/**
 * Verify Voluntary Sponsorship - TypeScript 版本
 * 验证自愿赞助配置是否正确
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const app = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const index = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const reference = readFileSync(new URL("../public/staging-reference.js", import.meta.url), "utf8");
const worker = readFileSync(new URL("../src/worker.js", import.meta.url), "utf8");
const footerNotice = "投資脈絡來自於台灣證券交易所 OpenAPI，本站購買中 OpenAPI 供個人學術研究之用，Podcast 為本站之附加利益使用，不構成買賣建議。所有資料僅供參考，不構成任何投資建議。";
const forbiddenPayment = /payment\.opay\.tw|PAYUNi|payuni\.com\.tw|歐付寶|編碼|1558355|data-support-plan|贊助付款|銀行帳?戶|銀行轉帳|LINE Pay 帳?|街口帳?/;
for (const [name, source] of Object.entries({ app, index, reference, worker })) {
    assert.doesNotMatch(source, forbiddenPayment, `${name} still contains a payment destination or account`);
}
assert.doesNotMatch(index, /href="\/support"|brand-sponsor-marquee|贊助?活動?/, "public shell still links to sponsorship");
assert.doesNotMatch(reference, /href="\/support"|贊助法?目|贊助?活動?|付款?確認?/, "reference shell still links to sponsorship");
assert.match(worker, /cleanPath === "\/support"[\s\S]{0,160}Response\.redirect\(new URL\("\/", request\.url\), 302\)/, "/support no longer redirects home");
assert.match(app, /const transcriptHref = currentEp \? `\/podcast\//, "Podcast transcript links are not local and public");
assert.match(app, /免費公?眾內容?研究?能?夠?以?款、?級?入?解?/, "free-access contract is missing");
assert.ok(index.includes(footerNotice) && worker.includes(footerNotice), "required footer notice is not present in both shells");
console.log("free public-access checks passed");
//# sourceMappingURL=verify-voluntary-sponsorship.js.map