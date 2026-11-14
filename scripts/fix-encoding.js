const fs = require('fs');

// Read original .js file (Node.js handles UTF-8 correctly)
const jsContent = fs.readFileSync('src/worker.js', 'utf8');

// Find STOCK_INDUSTRY_NAMES block and decode Chinese text
const startIdx = jsContent.indexOf('STOCK_INDUSTRY_NAMES');
const endIdx = jsContent.indexOf('AUTH_RATE', startIdx);
const industryBlock = jsContent.substring(startIdx, endIdx);

// Decode Chinese characters to Unicode escape sequences
function encodeChineseChars(text) {
  return text.replace(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g, (char) => {
    const code = char.codePointAt(0).toString(16).padStart(4, '0');
    return '\\u' + code.toUpperCase();
  });
}

const encodedBlock = encodeChineseChars(industryBlock);

// Read current corrupted worker.ts
const tsContent = fs.readFileSync('src/worker.ts', 'utf8');

// Find and replace the Chinese text in worker.ts
const tsStartIdx = tsContent.indexOf('STOCK_INDUSTRY_NAMES');
const tsEndIdx = tsContent.indexOf('AUTH_RATE', tsStartIdx);

if (tsStartIdx >= 0 && tsEndIdx >= 0) {
  const newContent = tsContent.substring(0, tsStartIdx) + encodedBlock + tsContent.substring(tsEndIdx);
  fs.writeFileSync('src/worker.ts', newContent, 'utf8');
  console.log('Replaced STOCK_INDUSTRY_NAMES with Unicode escapes');
} else {
  console.log('Could not find STOCK_INDUSTRY_NAMES in worker.ts');
}

// Now check compilation
console.log('Done encoding conversion');
