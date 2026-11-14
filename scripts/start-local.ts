/**
 * TWETQ Local Server - TypeScript 版本
 * 本地开发服务器，提供静态资产和 API 代理
 */

import { createServer } from "node:http";
import { readFileSync, statSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import app from "../src/worker.js";

// 类型定义
interface QueryOperation {
  bind(...nextValues: (string | number | boolean | null | undefined)[]): QueryOperation;
  first(): Record<string, unknown> | null;
  all(): { results: Record<string, unknown>[], success: true };
  run(): { success: true; meta: { changes: number; last_row_id: number } };
}

interface DatabaseBinding {
  prepare(sql: string): QueryOperation;
  batch(statements: QueryOperation[]): { success: true; meta: { changes: number; last_row_id: number } }[];
}

interface AssetsEnv {
  fetch: (request: Request) => Promise<Response>;
}

interface DBEnv {
  DB: DatabaseBinding;
}

interface FullEnv extends AssetsEnv, DBEnv {}

// 路径和配置常量
const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = resolve(projectDir, "public");
const localDataDir = resolve(projectDir, ".local-data");
const databasePath = resolve(localDataDir, "twetq.sqlite");
const host = "127.0.0.1";
const port = Number(process.env.PORT || 8787);
const maxBodyBytes = 2 * 1024 * 1024;

// MIME 类型映射
const mimeTypes = new Map<string, string>([
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

// 规范化绑定值
function normalizeBindings(values: (string | number | boolean | null | undefined)[]): (string | number | boolean | null | undefined)[] {
  return values.map((value) => (value === undefined ? null : value));
}

// 创建数据库绑定
function createDatabaseBinding(database: DatabaseSync): DatabaseBinding {
  return {
    prepare(sql: string): QueryOperation {
      const statement = database.prepare(sql);
      let values: (string | number | boolean | null | undefined)[] = [];
      return {
        bind(...nextValues: (string | number | boolean | null | undefined)[]): QueryOperation {
          values = nextValues;
          return this;
        },
        first(): Record<string, unknown> | null {
          return statement.get(...normalizeBindings(values)) || null;
        },
        all(): { results: Record<string, unknown>[], success: true } {
          return {
            results: statement.all(...normalizeBindings(values)),
            success: true,
          };
        },
        run(): { success: true; meta: { changes: number; last_row_id: number } } {
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
    },
    batch(statements: QueryOperation[]): { success: true; meta: { changes: number; last_row_id: number } }[] {
      return statements.map((statement) => statement.run());
    },
  };
}

// 安全资产路径
function safeAssetPath(pathname: string): string | null {
  let decoded: string;
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

// 获取资产
async function fetchAsset(request: Request): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  const target = safeAssetPath(new URL(request.url).pathname);
  if (!target) return new Response("Bad Request", { status: 400 });

  let filePath = target;
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

// 读取请求体
function readBody(request: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolveBody, rejectBody) => {
    const chunks: Buffer[] = [];
    let size = 0;
    request.on("data", (chunk: Buffer) => {
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

// 转换为 Request 对象
async function toRequest(request: NodeJS.ServerRequest): Promise<Request> {
  const url = new URL(request.url || "/", `http://${request.headers.host || `${host}:${port}`}`);
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(", ") : value as string);
  }
  const init: RequestInit = { method: request.method || "GET", headers };
  if (init.method !== "GET" && init.method !== "HEAD") {
    init.body = await readBody(request);
    init.duplex = "half" as any;
  }
  return new Request(url, init);
}

// 写入响应
async function writeResponse(nodeResponse: NodeJS.ServerResponse, response: Response): Promise<void> {
  const headers: Record<string, string | string[]> = {};
  response.headers.forEach((value: string, name: string) => {
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

// 初始化数据库
await mkdir(localDataDir, { recursive: true });
const database = new DatabaseSync(databasePath);
database.exec("PRAGMA journal_mode=WAL");

// 创建环境变量
const env: FullEnv = {
  ASSETS: { fetch: fetchAsset },
  DB: createDatabaseBinding(database),
};

// 创建服务器
const server = createServer(async (request: NodeJS.ServerRequest, nodeResponse: NodeJS.ServerResponse) => {
  try {
    const response = await app.fetch(await toRequest(request), env);
    await writeResponse(nodeResponse, response);
  } catch (error: unknown) {
    if (!nodeResponse.headersSent) {
      nodeResponse.writeHead(500, { "content-type": "application/json; charset=utf-8" });
      nodeResponse.end(JSON.stringify({ ok: false, error: String((error as Error)?.message || error) }));
    } else {
      nodeResponse.destroy(error as Error);
    }
  }
});

// 停止函数
function stop(): void {
  server.close(() => database.close());
}

process.once("SIGINT", stop);
process.once("SIGTERM", stop);
server.listen(port, host, () => {
  console.log(`TWETQ local website: http://${host}:${port}`);
  console.log("Local data is stored in .local-data; press Ctrl+C to stop.");
});

export { fetchAsset, createDatabaseBinding, toRequest, writeResponse };