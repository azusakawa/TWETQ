const fs = require('fs');

const path = 'src/worker.ts';
let content = fs.readFileSync(path, 'utf8');

// The previous fix was too aggressive - it replaced {} in ternary expressions
// where {} was an object literal value, not a type annotation.
// Fix the 4 lines that got incorrectly replaced:

// Line 859: ? { ... } : { [key: string]: unknown } -> ? { ... } : {}
content = content.replace(
  /futures\.txAfterHour \? \{ txAfterHour: futures\.txAfterHour \} : \{ \[key: string\]: unknown \}/,
  'futures.txAfterHour ? { txAfterHour: futures.txAfterHour } : {}'
);

// Line 1686: ? { ... } : { [key: string]: unknown } -> ? { ... } : {}
content = content.replace(
  /scriptNonce \? \{ "x-tq-csp-nonce": scriptNonce \} : \{ \[key: string\]: unknown \}/,
  'scriptNonce ? { "x-tq-csp-nonce": scriptNonce } : {}'
);

// Line 1882: ? { ... } : { [key: string]: unknown } -> ? { ... } : {}
content = content.replace(
  /allowCredentials \? \{ "access-control-allow-credentials": "true" \} : \{ \[key: string\]: unknown \}/,
  'allowCredentials ? { "access-control-allow-credentials": "true" } : {}'
);

// Line 4932: } : { [key: string]: unknown } -> } : {}
content = content.replace(
  /} : \{ \[key: string\]: unknown \}\s*$/,
  '} : {}'
);

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed 4 ternary expression errors');
