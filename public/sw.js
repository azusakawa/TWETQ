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

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

async function cacheFreshResponse(request, response) {
  if (!response.ok || response.bodyUsed) return response;
  const cachedResponse = response.clone();
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, cachedResponse);
  } catch (_) {}
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline")));
    return;
  }

  if (["style", "script"].includes(request.destination)) {
    event.respondWith(
      fetch(request).then((response) => cacheFreshResponse(request, response)).catch(() => caches.match(request))
    );
    return;
  }

  if (["image", "manifest"].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => cacheFreshResponse(request, response)))
    );
  }
});
