import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const paths = {
  app: new URL("../public/app.js", import.meta.url),
  index: new URL("../public/index.html", import.meta.url),
  worker: new URL("../src/worker.js", import.meta.url),
};
const forbiddenAds = /ca-pub-|googlesyndication|googleads\.g\.doubleclick|adtrafficquality|ADSENSE_CLIENT|ADS_TXT_CONTENT|adsEnabled|\/ads\.txt/;

assert.equal(existsSync(new URL("../public/ads.txt", import.meta.url)), false, "public ads.txt still exists");
assert.equal(existsSync(new URL("../Ads.txt", import.meta.url)), false, "source Ads.txt still exists");
for (const [name, path] of Object.entries(paths)) {
  assert.doesNotMatch(readFileSync(path, "utf8"), forbiddenAds, `${name} still contains third-party advertising configuration`);
}

console.log("third-party advertising removal checks passed");
