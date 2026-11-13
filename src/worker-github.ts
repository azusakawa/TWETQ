// TWETQ Cloudflare Worker (GitHub version)
// API 路由、靜態資產、外部 API 代理

// 外部的金融資料 API 主機白名單
const ALLOWED_HOSTS = new Set([
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

// 快取相關常數
const REALTIME_QUOTE_TTL_MS = 60 * 1000; // 即時報價 1 分鐘快取
const REALTIME_QUOTE_STALE_MS = 24 * 60 * 60 * 1000; // 24 小時過期
const REALTIME_QUOTE_MAX_CHANNELS = 120;
const REALTIME_QUOTE_UPSTREAM_CHUNK_SIZE = 25;
const MOPS_FINANCIAL_CACHE_PREFIX = "mops-financials:";
const MOPS_FINANCIAL_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 小時
const TAIFEX_PROXY_CACHE_TTL_MS = 3 * 60 * 1000; // 3 秒
const TAIFEX_PROXY_FAILURE_TTL_MS = 2 * 60 * 1000; // 2 秒
const TAIFEX_PROXY_FAILURE_THRESHOLD = 2;
const MARKET_UPSTREAM_TIMEOUT_MS = 12 * 1000; // 12 秒超時
const MOPS_OPENAPI_TIMEOUT_MS = 7 * 1000; // 7 秒
const HISTORY_CACHE_MAX_MONTHS = 480; // 40 年
const STOCK_QUERY_CACHE_PREFIX = "stock-query:v1:";
const STOCK_QUERY_CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 小時

// In-Memory 快取（Cloudflare Worker 版本）
const realtimeQuoteCache = new Map<string, any>();
const realtimeQuoteInFlight = new Map<string, Promise<any>>();
const mopsFinancialCache = new Map<string, any>();
const taifexProxyCache = new Map<string, any>();
const taifexProxyCircuit = new Map<string, any>();
const marketIndexCache = new Map<string, any>();
const marketIndexInFlight: Promise<any> | null = null;
const institutionalRadarCache = new Map<string, any>();
const institutionalRadarInFlight: Promise<any> | null = null;
const INSTITUTIONAL_RADAR_CACHE_TTL_MS = 10 * 60 * 1000; // 10 分鐘
const INSTITUTIONAL_RADAR_CACHE_KEY = "institutional-radar-v4";
const MARKET_SNAPSHOT_CACHE_KEY = "market-snapshot-v1";
const MARKET_SNAPSHOT_TTL_MS = 22 * 60 * 60 * 1000; // 22 小時
const MARKET_INDEX_CACHE_TTL_MS = 60 * 1000; // 1 分鐘

// Site metadata
const SITE_NAME = "TWETQ Podcast 投資脈絡";
const SITE_SHORT_NAME = "TWETQ";
const SITE_DESCRIPTION = "以 Podcast 為入口，整理每集重點、逐字稿來源、提及產業與個股，並連接台股官方資料作為研究輔助。本站為非官方內容整理網站。";
const SITE_LOCALE = "zh_TW";
const OG_IMAGE_PATH = "/og/card.svg";

// 安全標頭（根據 GitHub 版本更新）
function applySecurityHeaders(headers: Headers) {
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-XSS-Protection", "1; mode=block");
  headers.set("Referrer-Policy", "no-referrer-when-downgrade");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  // Content-Security-Policy（根據 GitHub 版本）
  headers.set("Content-Security-Policy", 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; " +
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; " +
    "frame-src https://www.google.com; " +
    "connect-src 'self' https:; " +
    "object-src 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'"
  );
  
  // Cache-Control 默認值
  if (!headers.has("Cache-Control")) {
    headers.set("Cache-Control", "public, max-age=3600");
  }

  return headers;
}

// 處理 i18n 請求（修正版）- 使用 env.ASSETS.fetch() 存取 Assets
async function handleI18nRequest(request: Request, env: any) {
  const url = new URL(request.url);
  const localePath = url.pathname.split("/").pop();
  
  if (localePath?.endsWith(".json")) {
    const locale = localePath.replace(".json", "");
    const allowedLocales = ["zh-TW", "en-US", "ja-JP"];
    if (!allowedLocales.includes(locale)) {
      return null; // 不是 i18n 請求，交由其他處理器處理
    }
    // 只處理 /i18n/ 路徑
    if (url.pathname.startsWith("/i18n/")) {
      try {
        // 使用 env.ASSETS.fetch() 需要完整 URL
        const assetUrl = new URL("/i18n/" + locale + ".json", url.origin).href;
        const response = await env.ASSETS.fetch(assetUrl);
        const data = await response.json();
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "public, max-age=3600"
          }
        });
      } catch (e) {
        return null; // 找不到檔案，交由其他處理器處理
      }
    }
  }
  return null;
}

// 處理 Podcast API 路由 - 使用 env.ASSETS.fetch() 存取 Assets
async function handlePodcastApi(request: Request, env: any) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // /api/podcast/latest 和 /api/podcast/episodes 都返回 podcast-editorial.json
  if (pathname === "/api/podcast/latest" || pathname.startsWith("/api/podcast/latest?") ||
      pathname === "/api/podcast/episodes" || pathname.startsWith("/api/podcast/episodes?")) {
    try {
      // 使用 env.ASSETS.fetch() 需要完整 URL
      const assetUrl = new URL("/data/podcast-editorial.json", url.origin).href;
      const response = await env.ASSETS.fetch(assetUrl);
      if (response.ok) {
        return new Response(response.body, {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "public, max-age=3600"
          }
        });
      }
      return new Response(JSON.stringify({ ok: false, error: "Podcast editorial data not found" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: e.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  // /api/podcast/stocks 返回 podcast-stock-tracker.json
  if (pathname === "/api/podcast/stocks") {
    try {
      const assetUrl = new URL("/data/podcast-stock-tracker.json", url.origin).href;
      const response = await env.ASSETS.fetch(assetUrl);
      if (response.ok) {
        return new Response(response.body, {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "public, max-age=3600"
          }
        });
      }
      return new Response(JSON.stringify({ ok: false, error: "Podcast stock tracker data not found" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: e.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  return null;
}

// 處理市場指數 API
async function handleMarketIndexes(request: Request, env: any) {
  const url = new URL(request.url);
  const cacheKey = "market-indexes";
  
  // 檢查快取
  if (marketIndexCache.has(cacheKey)) {
    const cached = marketIndexCache.get(cacheKey);
    if (Date.now() - cached.timestamp < MARKET_INDEX_CACHE_TTL_MS) {
      return new Response(JSON.stringify(cached.data), {
        status: 200,
        headers: { 
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "public, max-age=60"
        }
      });
    }
  }

  // 如果正在獲取中，等待完成
  if (marketIndexInFlight) {
    try {
      const result = await marketIndexInFlight;
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "public, max-age=60"
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({ ok: false, error: "Failed to fetch market indexes" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  // 獲取新資料
  const fetchPromise = (async () => {
    try {
      const [twseResponse, tpexResponse, taifexResponse] = await Promise.all([
        fetch("https://www.twse.com.tw/rwd/zh/afterTrading/MI_INDEX", {
          headers: { "Accept": "application/json" },
          signal: AbortSignal.timeout(MARKET_UPSTREAM_TIMEOUT_MS)
        }),
        fetch("https://www.tpex.org.tw/openapi/v1/tpex_index", {
          signal: AbortSignal.timeout(MARKET_UPSTREAM_TIMEOUT_MS)
        }),
        fetch("https://openapi.taifex.com.tw/v1/DailyMarketReportFut", {
          signal: AbortSignal.timeout(MARKET_UPSTREAM_TIMEOUT_MS)
        })
      ]);

      const [twseData, tpexData, taifexData] = await Promise.all([
        twseResponse.json(),
        tpexResponse.json(),
        taifexResponse.json()
      ]);

      const result = {
        ok: true,
        twse: twseData,
        tpex: tpexData,
        taifex: taifexData
      };

      // 更新快取
      marketIndexCache.set(cacheKey, {
        timestamp: Date.now(),
        data: result
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "public, max-age=60"
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({ ok: false, error: "Failed to fetch market indexes" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  })();

  // 為了避免重複請求，保存在 flight 狀態
  marketIndexInFlight = fetchPromise;
  
  try {
    const result = await fetchPromise;
    marketIndexInFlight = null;
    return result;
  } catch (error) {
    marketIndexInFlight = null;
    throw error;
  }
}

// 處理市場快照 API
async function handleMarketSnapshot(request: Request, env: any) {
  const url = new URL(request.url);
  const cacheKey = MARKET_SNAPSHOT_CACHE_KEY;
  
  // 檢查快取
  if (realtimeQuoteCache.has(cacheKey)) {
    const cached = realtimeQuoteCache.get(cacheKey);
    if (Date.now() - cached.timestamp < MARKET_SNAPSHOT_TTL_MS) {
      return new Response(JSON.stringify(cached.data), {
        status: 200,
        headers: { 
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "public, max-age=3600"
        }
      });
    }
  }

  try {
    const [listedResponse, otcResponse] = await Promise.all([
      fetch("https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL", {
        signal: AbortSignal.timeout(MARKET_UPSTREAM_TIMEOUT_MS)
      }),
      fetch("https://www.tpex.org.tw/openapi/v1/tpex_mainboard_quotes", {
        signal: AbortSignal.timeout(MARKET_UPSTREAM_TIMEOUT_MS)
      })
    ]);

    const [listedData, otcData] = await Promise.all([
      listedResponse.json(),
      otcResponse.json()
    ]);

    const result = {
      ok: true,
      quotes: [
        ...listedData.map((item: any) => ({
          code: item.stockNo,
          close: parseFloat(item.close),
          change: parseFloat(item.change),
          changePct: parseFloat(item.changePercent),
          volume: parseInt(item.volume)
        })),
        ...otcData.map((item: any) => ({
          code: item.stockNo,
          close: parseFloat(item.close),
          change: parseFloat(item.change),
          changePct: parseFloat(item.changePercent),
          volume: parseInt(item.volume)
        }))
      ]
    };

    // 更新快取
    realtimeQuoteCache.set(cacheKey, {
      timestamp: Date.now(),
      data: result
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=3600"
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: "Failed to fetch market snapshot" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// 處理即時報價 API
async function handleRealtimeQuotes(request: Request, env: any) {
  const url = new URL(request.url);
  const channels = url.searchParams.get("channels");
  
  if (!channels) {
    return new Response(JSON.stringify({ ok: false, error: "Missing channels parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const channelArray = channels.split("|").filter(Boolean);
  
  // 驗證頻道數量
  if (channelArray.length > REALTIME_QUOTE_MAX_CHANNELS) {
    return new Response(JSON.stringify({ ok: false, error: "Too many channels requested" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  // 將請求分組處理
  const results = [];
  
  for (let i = 0; i < channelArray.length; i += REALTIME_QUOTE_UPSTREAM_CHUNK_SIZE) {
    const chunk = channelArray.slice(i, i + REALTIME_QUOTE_UPSTREAM_CHUNK_SIZE);
    
    // 檢查快取
    const cachedQuotes = [];
    const toFetch = [];
    
    for (const code of chunk) {
      const cacheKey = `realtime-quote:${code}`;
      if (realtimeQuoteCache.has(cacheKey)) {
        const cached = realtimeQuoteCache.get(cacheKey);
        if (Date.now() - cached.timestamp < REALTIME_QUOTE_TTL_MS) {
          cachedQuotes.push(cached.data);
        } else {
          toFetch.push(code);
        }
      } else {
        toFetch.push(code);
      }
    }

    if (toFetch.length > 0) {
      const fetchPromises = toFetch.map(async (code) => {
        try {
          // 獲取即時報價
          const response = await fetch(`https://www.twse.com.tw/quote/quote.html?stockNo=${code}`, {
            signal: AbortSignal.timeout(MARKET_UPSTREAM_TIMEOUT_MS)
          });
          
          // 解析 HTML 獲取資料（簡化處理）
          const html = await response.text();
          // 在實際實現中，這裡應該解析 HTML 獲取真正的報價資料
          
          const quote = {
            code,
            timestamp: Date.now(),
            // 此處應解析實際資料
          };
          
          // 更新快取
          const cacheKey = `realtime-quote:${code}`;
          realtimeQuoteCache.set(cacheKey, {
            timestamp: Date.now(),
            data: quote
          });
          
          return quote;
        } catch (error) {
          // 如果獲取失敗，返回預設資料
          return {
            code,
            timestamp: Date.now(),
            error: "Failed to fetch quote"
          };
        }
      });
      
      const chunkResults = await Promise.all(fetchPromises);
      results.push(...chunkResults);
    } else {
      // 所有都來自快取
      results.push(...cachedQuotes);
    }
  }

  return new Response(JSON.stringify({ ok: true, quotes: results }), {
    status: 200,
    headers: { 
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-cache"
    }
  });
}

// 處理 MOPS 財報 API
async function handleMopsFinancials(request: Request, env: any) {
  const url = new URL(request.url);
  const stockNo = url.searchParams.get("stockNo");
  
  if (!stockNo) {
    return new Response(JSON.stringify({ ok: false, error: "Missing stockNo parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const cacheKey = `${MOPS_FINANCIAL_CACHE_PREFIX}${stockNo}`;
  
  // 檢查快取
  if (mopsFinancialCache.has(cacheKey)) {
    const cached = mopsFinancialCache.get(cacheKey);
    if (Date.now() - cached.timestamp < MOPS_FINANCIAL_CACHE_TTL_MS) {
      return new Response(JSON.stringify(cached.data), {
        status: 200,
        headers: { 
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "public, max-age=86400"
        }
      });
    }
  }

  try {
    // 獲取 MOPS 財報資料（簡化實現）
    const result = {
      ok: true,
      stockNo,
      // 實際實現中應獲取真正的 MOPS 財報資料
      financials: []
    };

    // 更新快取
    mopsFinancialCache.set(cacheKey, {
      timestamp: Date.now(),
      data: result
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=86400"
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: "Failed to fetch MOPS financials" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// 處理三大法人資料 API
async function handleInstitutionalRadar(request: Request, env: any) {
  const url = new URL(request.url);
  
  // 檢查快取
  if (institutionalRadarCache.has(INSTITUTIONAL_RADAR_CACHE_KEY)) {
    const cached = institutionalRadarCache.get(INSTITUTIONAL_RADAR_CACHE_KEY);
    if (Date.now() - cached.timestamp < INSTITUTIONAL_RADAR_CACHE_TTL_MS) {
      return new Response(JSON.stringify(cached.data), {
        status: 200,
        headers: { 
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "public, max-age=600"
        }
      });
    }
  }

  // 獲取三大法人資料（簡化實現）
  try {
    const result = {
      ok: true,
      data: {
        // 實際實現中應獲取真正的三大法人資料
      }
    };

    // 更新快取
    institutionalRadarCache.set(INSTITUTIONAL_RADAR_CACHE_KEY, {
      timestamp: Date.now(),
      data: result
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=600"
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: "Failed to fetch institutional radar data" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// 處理 K 線圖 API
async function handleKline(request: Request, env: any) {
  const url = new URL(request.url);
  const stockNo = url.searchParams.get("stockNo");
  
  if (!stockNo) {
    return new Response(JSON.stringify({ ok: false, error: "Missing stockNo parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  // 簡化實現：返回示例數據
  const result = {
    ok: true,
    stockNo,
    klines: [
      // 實際實現中應獲取真正的 K 線數據
      { date: "2024-01-01", open: 100, high: 110, low: 95, close: 105, volume: 1000 },
      { date: "2024-01-02", open: 105, high: 115, low: 100, close: 110, volume: 1200 }
    ]
  };

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    }
  });
}

// 處理健康檢查 API
async function handleHealthCheck(request: Request, env: any) {
  return new Response(JSON.stringify({ 
    ok: true, 
    status: "healthy",
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: { 
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-cache"
    }
  });
}

// 處理主請求
async function handleRequest(request: Request, env: any) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // 處理 i18n 請求
  const i18nResult = await handleI18nRequest(request, env);
  if (i18nResult) return i18nResult;

  // 處理 Podcast API
  const podcastResult = await handlePodcastApi(request, env);
  if (podcastResult) return podcastResult;

  // 處理 API 路由
  if (pathname === "/api/market/indexes") {
    return handleMarketIndexes(request, env);
  }
  
  if (pathname === "/api/market/snapshot") {
    return handleMarketSnapshot(request, env);
  }
  
  if (pathname === "/api/realtime-quotes") {
    return handleRealtimeQuotes(request, env);
  }
  
  if (pathname === "/api/mops-financials") {
    return handleMopsFinancials(request, env);
  }
  
  if (pathname === "/api/institutional-radar") {
    return handleInstitutionalRadar(request, env);
  }
  
  if (pathname === "/api/kline") {
    return handleKline(request, env);
  }
  
  if (pathname === "/api/health") {
    return handleHealthCheck(request, env);
  }

  // 如果沒有匹配的路由，返回 404
  return new Response(JSON.stringify({ ok: false, error: "Not found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" }
  });
}

// 主處理函數
export default {
  async fetch(request: Request, env: any) {
    try {
      // 設置安全標頭
      const response = await handleRequest(request, env);
      
      // 添加安全標頭到回應
      const headers = new Headers(response.headers);
      applySecurityHeaders(headers);
      
      return new Response(response.body, {
        status: response.status,
        headers
      });
    } catch (error) {
      return new Response(JSON.stringify({ ok: false, error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
};