const fs = require('fs');

const path = 'public/app.ts';
const content = fs.readFileSync(path, 'utf-8');
const lines = content.split('\n');

const newLines = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  // Skip lines with removed navigation links
  if (line.includes('"/market"') || line.includes('"/institutional"') || line.includes('"/screen"')) {
    continue;
  }
  newLines.push(line);
}

const modified = newLines.join('\n');
fs.writeFileSync(path, modified, 'utf-8');
console.log('Removed /market, /institutional, /screen navigation entries');