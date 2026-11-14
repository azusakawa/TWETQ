const fs = require('fs');

// Read the original JavaScript file (Node.js handles UTF-8 correctly)
const jsContent = fs.readFileSync('src/worker.js', 'utf8');

// Apply batch 1 TypeScript annotations (ASCII-only replacements)
let content = jsContent;

// Remove @__PURE__ comments and fix import paths
content = content.replace(/\/\*\s*@__PURE__\s*\*\/\s*/g, '');
content = content.replace(/from "\.\/((?:[a-z_-]+)\.js)"/g, 'from "./$1"');
content = content.replace(/from "\.\/src\/([a-z_-]+)\.js"/g, 'from "./$1"');

// Apply batch 1 type annotations to key functions
const batch1Replacements = [
  ['const json = (payload, status = 200, extraHeaders = {}) => {', 'const json = (payload: unknown, status: number = 200, extraHeaders: Record<string, string> = {}): Response => {'],
  ['const jsonNoCors = (payload, status = 200, extraHeaders = {}) => {', 'const jsonNoCors = (payload: unknown, status: number = 200, extraHeaders: Record<string, string> = {}): Response => {'],
  ['const randomId = (prefix = "") => {', 'const randomId = (prefix = ""): string => {'],
  ['const bytesToBase64 = (bytes) => {', 'const bytesToBase64 = (bytes: Uint8Array): string => {'],
  ['const base64ToBytes = (value) => {', 'const base64ToBytes = (value: string): Uint8Array => {'],
  ['const handleRegister = (request, env) => {', 'async function handleRegister(request: Request, env: unknown): Promise<Response> {'],
  ['const handleLogin = (request, env) => {', 'async function handleLogin(request: Request, env: unknown): Promise<Response> {'],
  ['const handleLogout = (request, env) => {', 'async function handleLogout(request: Request, env: unknown): Promise<Response> {'],
  ['const handleMe = (request, env) => {', 'async function handleMe(request: Request, env: unknown): Promise<Response> {'],
  ['const handleGetPortfolio = (request, env) => {', 'async function handleGetPortfolio(request: Request, env: unknown): Promise<Response> {'],
  ['const handleSavePortfolio = (request, env) => {', 'async function handleSavePortfolio(request: Request, env: unknown): Promise<Response> {'],
  ['const handleRealtimeQuotes = (request) => {', 'async function handleRealtimeQuotes(request: Request): Promise<Response> {'],
  ['const handleMarketIndexes = (request) => {', 'async function handleMarketIndexes(request: Request): Promise<Response> {'],
  ['const handleKLine = (request, env) => {', 'async function handleKLine(request: Request, env: unknown): Promise<Response> {'],
];

for (const [old, new_] of batch1Replacements) {
  content = content.replace(old, new_);
}

// Encode ALL Chinese characters to Unicode escape sequences
content = content.replace(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g, (char) => {
  const code = char.codePointAt(0).toString(16).padStart(4, '0').toUpperCase();
  return '\\u' + code;
});

fs.writeFileSync('src/worker.ts', content, 'utf8');
console.log('Complete rewrite with Unicode escapes and batch 1 annotations');
