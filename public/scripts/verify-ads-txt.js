/**
 * Verify Ads.txt Removal - TypeScript 版本
 * 验证第三方广告配置是否已移除
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
const paths = {
    app: new URL("../public/app.js", import.meta.url),
    index: new URL("../public/index.html", import.meta.url),
    worker: new URL("../src/worker.js", import.meta.url),
};
const forbiddenAds = /ca-pub-|googlesyndication|googleads\.doubleclick|adtrafficquality|ADSENSE_CLIENT|ADS_TXT_CONTENT|adsEnabled|\/ads\.txt/;
assert.equal(existsSync(new URL("../public/ads.txt", import.meta.url)), false, "public ads.txt still exists");
assert.equal(existsSync(new URL("../Ads.txt", import.meta.url)), false, "source Ads.txt still exists");
for (const [name, path] of Object.entries(paths)) {
    const content = readFileSync(path, "utf8");
    assert.doesNotMatch(content, forbiddenAds, `${name} still contains third-party advertising configuration`);
}
console.log("third-party advertising removal checks passed");
//# sourceMappingURL=verify-ads-txt.js.map