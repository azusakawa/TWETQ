"use strict";
/**
 * TWETQ Service Worker - TypeScript 版本
 * 负责应用壳缓存、离线支持和资源预加载
 */
const CACHE_NAME = "twetq-shell-20260905-free-site-v1";
const APP_SHELL = [
    "/",
    "/offline",
    "/site.webmanifest",
    "/tokens.css?v=20260726-mobile-style-v1",
    "/lofi.css?v=20260905-free-site-v1",
    "/vendor/bootstrap-twetq.min.css?v=20260819-bootstrap-production-v1",
    "/vendor/bootstrap.bundle.min.js?v=5.3.8",
    "/bootstrap-loader.js?v=20260905-free-site-v1",
    "/staging-reference.css?v=20260905-free-site-v1",
    "/staging-reference.js?v=20260905-free-site-v1",
    "/bootstrap-adapter.js?v=20260905-free-site-v1",
    "/vendor/vue.global.prod.js?v=3.5.40",
    "/vue-shell.js?v=20260905-free-site-v1",
    "/app.js?v=20260905-free-site-v1",
    "/assets/logo-a1-small.png",
    "/assets/podcast-cover.svg",
    "/assets/apple-touch-icon.png",
    "/assets/app-icon-192.png",
    "/assets/app-icon-512.png",
];
// 安装事件 - 缓存应用壳资源
self.addEventListener("install", (event) => {
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL.map((entry) => entry.url))).then(() => self.skipWaiting()));
});
// 激活事件 - 清理旧缓存
self.addEventListener("activate", (event) => {
    event.waitUntil(caches.keys()
        .then((names) => Promise.all(names
        .filter((name) => name !== CACHE_NAME)
        .map((name) => caches.delete(name))))
        .then(() => self.clients.claim()));
});
// 缓存新鲜响应
async function cacheFreshResponse(request, response) {
    if (!response.ok || response.bodyUsed)
        return response;
    const cachedResponse = response.clone();
    try {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, cachedResponse);
    }
    catch (_) {
        // 静默处理缓存失败
    }
    return response;
}
// 获取事件 - 处理网络请求和缓存策略
self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);
    // 排除非 GET 请求、非本站来源和 API 请求
    if (request.method !== "GET" ||
        url.origin !== self.location.origin ||
        url.pathname.startsWith("/api/")) {
        return;
    }
    // 导航请求 - 尝试网络，失败则返回离线页面
    if (request.mode === "navigate") {
        event.respondWith(fetch(request).catch(() => caches.match("/offline")));
        return;
    }
    // 样式和脚本 - 尝试网络，缓存新鲜响应
    if (["style", "script"].includes(request.destination)) {
        event.respondWith(fetch(request)
            .then((response) => cacheFreshResponse(request, response))
            .catch(() => caches.match(request)));
        return;
    }
    // 图片和 manifest - 先查缓存，再获取网络
    if (["image", "manifest"].includes(request.destination)) {
        event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => cacheFreshResponse(request, response))));
    }
});
//# sourceMappingURL=sw.js.map