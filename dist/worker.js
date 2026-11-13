var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/worker.js
var ALLOWED_HOSTS = /* @__PURE__ */ new Set([
  "mis.twse.com.tw",
  "mis.taifex.com.tw",
  "www.twse.com.tw",
  "www.tpex.org.tw",
  "openapi.twse.com.tw",
  "mopsov.twse.com.tw",
  "openapi.taifex.com.tw",
  "www.taifex.com.tw",
  "stockhomes.org",
  "www.moneydj.com"
]);
async function handleI18nRequest(request, env) {
  const url = new URL(request.url);
  const localePath = url.pathname.split("/").pop();
  if (localePath.endsWith(".json")) {
    const locale = localePath.replace(".json", "");
    const allowedLocales = ["zh-TW", "en-US", "ja-JP"];
    if (!allowedLocales.includes(locale)) {
      return new Response("Not Found", { status: 404 });
    }
    try {
      const response = await fetch("/i18n/" + locale + ".json");
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "public, max-age=3600"
        }
      });
    } catch (e) {
      return new Response("Internal Error", { status: 500 });
    }
  }
  return null;
}
__name(handleI18nRequest, "handleI18nRequest");
async function handleFetchProxy(request, env) {
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get("url");
  if (!targetUrl) {
    return new Response("Missing ?url= parameter", { status: 400 });
  }
  try {
    const parsed = new URL(targetUrl);
    if (!ALLOWED_HOSTS.has(parsed.hostname)) {
      return new Response("Host not allowed: " + parsed.hostname, { status: 403 });
    }
    const headers = new Headers(request.headers);
    headers.set("User-Agent", "TWETQ-Proxy/1.0");
    headers.delete("cf-connection-info");
    headers.delete("cf-ipcity");
    headers.delete("cf-region");
    const proxyRequest = new Request(targetUrl, {
      method: request.method,
      headers,
      body: request.body,
      duplex: "half"
    });
    const response = await fetch(proxyRequest);
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders
    });
  } catch (e) {
    return new Response("Proxy error: " + e.message, { status: 502 });
  }
}
__name(handleFetchProxy, "handleFetchProxy");
async function handleMopsFinancials(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const ex = url.searchParams.get("ex");
  if (!code) {
    return new Response(JSON.stringify({ ok: false, error: "Missing ?code= parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  var mopsUrl = "https://mopsov.twse.com.tw/api/v1/mops/t187ap03?cotno2=" + code;
  if (ex) {
    mopsUrl += "&exope=" + ex;
  }
  try {
    const response = await fetch(mopsUrl);
    const data = await response.json().catch(function() {
      return null;
    });
    if (!data) {
      return new Response(JSON.stringify({ ok: false, error: "MOPS API error" }), {
        status: 502,
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({ ok: true, data }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 502,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(handleMopsFinancials, "handleMopsFinancials");
async function handlePublicConfig(request, env) {
  return new Response(JSON.stringify({
    ok: true,
    turnstileEnabled: false,
    turnstileSiteKey: "",
    authReady: true,
    authMode: "",
    authMessage: ""
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json"
    }
  });
}
__name(handlePublicConfig, "handlePublicConfig");
async function handleRequest(request, env) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  var i18nResponse = await handleI18nRequest(request, env);
  if (i18nResponse) return i18nResponse;
  if (pathname.startsWith("/api/fetch")) {
    return handleFetchProxy(request, env);
  }
  if (pathname.startsWith("/api/mops-financials")) {
    return handleMopsFinancials(request, env);
  }
  if (pathname.startsWith("/api/public-config")) {
    return handlePublicConfig(request, env);
  }
  if (pathname.startsWith("/api/")) {
    return new Response(JSON.stringify({ ok: false, error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }
  return env.ASSETS.fetch(request);
}
__name(handleRequest, "handleRequest");
var worker_default = {
  fetch: handleRequest
};
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
