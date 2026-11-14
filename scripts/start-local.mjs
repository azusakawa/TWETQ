import { createServer } from "node:http";
import { readFileSync, statSync, existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import app from "../src/worker.js";

const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = resolve(projectDir, "public");
const localDataDir = resolve(projectDir, ".local-data");
const databasePath = resolve(localDataDir, "twetq.sqlite");
const host = "127.0.0.1";
const port = Number(process.env.PORT || 8787);
const maxBodyBytes = 2 * 1024 * 1024;

// 從 TypeScript 源碼轉譯為 JavaScript
function stripTypeScript(tsContent) {
  return tsContent
    // 移除 @ts-nocheck 註解
    .replace(/^\/\/ @ts-nocheck\n/, '')
    // 移除函數參數的型別註解: (param: Type) → (param)
    .replace(/:(\s*)([A-Za-z<>\[\]|&,? ]+)(\s*)[\),]/g, '$1$3)')
    // 移除回傳型別: { → {
    .replace(/:\s*(Promise<Response>|Response|string|number|boolean|void|unknown|any|\{[^}]*\}|[A-Z][A-Za-z<>\[\]|&,? ]*)(\s*\{)/g, '$2')
    // 移除 as casts: as SomeType
    .replace(/ as [A-Za-z<>\[\]|&,? ]+/g, '')
    // 移除 interface/type 宣告
    .replace(/^(interface|type)\s+\w+[^{]*\{[^}]*\}/gms, '')
    // 移除 const/let/var 的型別註解
    .replace(/:\s*(Array<[^>]+>|string|number|boolean|void|any|unknown|\{[^}]*\}|[A-Z][A-Za-z<>\[\]|&,? ]*)/g, '')
    ;
}

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".xml", "application/xml; charset=utf-8"],
]);

function normalizeBindings(values) {
  return values.map((value) => (value === undefined ? null : value));
}

function createDatabaseBinding(database) {
  return {
    prepare(sql) {
      const statement = database.prepare(sql);
      let values = [];
      const query = {
        bind(...nextValues) {
          values = nextValues;
          return query;
        },
        first() {
          return statement.get(...normalizeBindings(values)) || null;
        },
        all() {
          return {
            results: statement.all(...normalizeBindings(values)),
            success: true,
            meta: {},
          };
        },
        run() {
          const result = statement.run(...normalizeBindings(values));
          return {
            success: true,
            meta: {
              changes: Number(result.changes || 0),
              last_row_id: Number(result.lastInsertRowid || 0),
            },
          };
        },
      };
      return query;
    },
    batch(statements) {
      return statements.map((statement) => statement.run());
    },
  };
}

function safeAssetPath(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname || "/");
  } catch {
    return null;
  }
  if (decoded.includes("\0")) return null;
  const relative = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const target = resolve(publicDir, relative);
  if (target !== publicDir && !target.startsWith(`${publicDir}${sep}`)) return null;
  return target;
}

async function fetchAsset(request) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  const target = safeAssetPath(new URL(request.url).pathname);
  if (!target) return new Response("Bad Request", { status: 400 });

  let filePath = target;
  const isTsRequest = extname(filePath).toLowerCase() === ".ts";
  if (isTsRequest && existsSync(filePath)) {
    const tsContent = readFileSync(filePath, "utf-8");
    const jsContent = stripTypeScript(tsContent);
    return new Response(request.method === "HEAD" ? null : jsContent, {
      status: 200,
      headers: {
        "cache-control": "public, max-age=3600",
        "content-type": "application/javascript; charset=utf-8",
      },
    });
  }
  try {
    if (statSync(filePath).isDirectory()) filePath = resolve(filePath, "index.html");
    const body = readFileSync(filePath);
    return new Response(request.method === "HEAD" ? null : body, {
      status: 200,
      headers: {
        "cache-control": extname(filePath) === ".html" ? "no-cache" : "public, max-age=3600",
        "content-type": mimeTypes.get(extname(filePath).toLowerCase()) || "application/octet-stream",
      },
    });
  } catch {
    return new Response("Not Found", { status: 404 });
  }
}

function readBody(request) {
  return new Promise((resolveBody, rejectBody) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBodyBytes) {
        rejectBody(new Error("request body too large"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolveBody(Buffer.concat(chunks)));
    request.on("error", rejectBody);
  });
}

async function toRequest(request) {
  const url = new URL(request.url || "/", `http://${request.headers.host || `${host}:${port}`}`);
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(", ") : value);
  }
  const init = { method: request.method || "GET", headers };
  if (init.method !== "GET" && init.method !== "HEAD") {
    init.body = await readBody(request);
    init.duplex = "half";
  }
  return new Request(url, init);
}

async function writeResponse(nodeResponse, response) {
  const headers = {};
  response.headers.forEach((value, name) => {
    headers[name] = value;
  });
  const setCookies = response.headers.getSetCookie?.() || [];
  if (setCookies.length) headers["set-cookie"] = setCookies;
  nodeResponse.writeHead(response.status, headers);
  if (response.status === 204 || response.status === 304) {
    nodeResponse.end();
    return;
  }
  nodeResponse.end(Buffer.from(await response.arrayBuffer()));
}

await mkdir(localDataDir, { recursive: true });
const database = new DatabaseSync(databasePath);
database.exec("PRAGMA journal_mode=WAL");
const env = {
  ASSETS: { fetch: fetchAsset },
  DB: createDatabaseBinding(database),
};

const server = createServer(async (request, nodeResponse) => {
  try {
    const response = await app.fetch(await toRequest(request), env);
    await writeResponse(nodeResponse, response);
  } catch (error) {
    if (!nodeResponse.headersSent) {
      nodeResponse.writeHead(500, { "content-type": "application/json; charset=utf-8" });
      nodeResponse.end(JSON.stringify({ ok: false, error: String(error?.message || error) }));
    } else {
      nodeResponse.destroy(error);
    }
  }
});

function stop() {
  server.close(() => database.close());
}

process.once("SIGINT", stop);
process.once("SIGTERM", stop);
server.listen(port, host, () => {
  console.log(`TWETQ local website: http://${host}:${port}`);
  console.log("Local data is stored in .local-data; press Ctrl+C to stop.");
});
