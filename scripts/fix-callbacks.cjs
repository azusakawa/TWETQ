const fs = require('fs');

const path = 'src/worker.ts';
let content = fs.readFileSync(path, 'utf8');

// Fix callback parameters: (x) => { -> (x: { [key: string]: unknown }) => {
const params = ['item', 'row', 'key', 'value', 'name', 'code', 'data', 'error', 'record', 'entry', 'quote', 'stock', 'day', 'parts', 'summary', 'index', 'path', 'link', 'text', 'html', 'category', 'match', 'content', 'fallback', 'terms', 'section', 'tone', 'children', 'props', 'state', 'events', 'signals', 'tags', 'attrs', 'rows', 'cols', 'labels', 'messages', 'warnings'];

for (const p of params) {
  const regex = new RegExp(`\\(${p}\\)\\s*=>\\s*\\{`, 'g');
  const matches = content.match(regex);
  if (matches && matches.length > 0) {
    content = content.replace(regex, `(${p}: { [key: string]: unknown }) => {`);
    console.log(`  ${p}: ${matches.length} fixes`);
  }
}

// Fix (a, b) => { -> (a: { [key: string]: unknown }, b: { [key: string]: unknown }) => {
content = content.replace(/\(a\),\s*b\)\s*=>\s*\{/g, '(a: { [key: string]: unknown }, b: { [key: string]: unknown }) => {');

// Fix empty array declarations
content = content.replace(/const\s+(\w+)\s*=\s*\[\]/g, 'const $1: unknown[] = []');

// Fix { } as standalone object type with index signature
content = content.replace(/:\s*\{\}\s*(?=\n)/g, ': { [key: string]: unknown }');

// Fix (){} -> ({} as Record<string, unknown>)
content = content.replace(/\(\{\}\)/g, '({} as Record<string, unknown>)');

fs.writeFileSync(path, content, 'utf8');
console.log('Callback annotations done');
