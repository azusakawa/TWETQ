/**
 * TWETQ Service Worker - TypeScript 版本
 * 负责应用壳缓存、离线支持和资源预加载
 */
declare const CACHE_NAME: "twetq-shell-20260905-free-site-v1";
interface CacheEntry {
    url: string;
}
declare const APP_SHELL: CacheEntry[];
declare function cacheFreshResponse(request: Request, response: Response): Promise<Response>;
//# sourceMappingURL=sw.d.ts.map