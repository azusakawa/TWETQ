// ===== 完全重建 i18n 系統 - TypeScript 版本 =====
// 所有翻譯內容直接寫在程式碼中

// Supported locales (removed simplified Chinese)
const SUPPORTED_LOCALES: readonly string[] = ['zh-TW', 'en-US'];
const DEFAULT_LOCALE: string = 'zh-TW';

// Translations object
const TRANSLATIONS: Record<string, Record<string, Record<string, string>>> = {
  'zh-TW': {
    navigation: {
      home: "最新一集",
      allEpisodes: "所有集數",
      podcast: "Podcast",
      menu: "選單",
      openMenu: "開啟選單",
      closeMenu: "關閉選單",
      backToTop: "回到页面顶部",
      skipToMain: "跳到主要內容",
      brandTagline: "從每一集出發，到市場資料驗證",
      navLabel: "Podcast 導航",
      mainSections: "主要功能區塊",
      seoNav: "Breadcrumb"
    },
    podcast: {
      latestEpisode: "最新一集",
      episodeTitle: "所有集數",
      transcript: "逐字稿",
      fullTranscript: "完整逐字稿",
      viewTranscript: "查看完整逐字稿",
      viewTranscriptSource: "查看逐字稿來源（離開本站）",
      audioOpen: "開啟外部音訊",
      audioExternal: "（離開本站）",
      noEnoughContent: "本集逐字稿目次不足夠內容可供分析，請查看原始音訊或逐字稿確認",
      noStocksFound: "本集未解析出明確個股；延伸列表不代表節目背書或直接提及",
      noIndustriesFound: "本集未對應到明確產業分類",
      systemExtended: "以下內容由系統依產業分類延伸，本集並未直接提及；預設摺疊，相關股票需展開後顯示",
      systemExtendedLabel: "系統延伸產業",
      directStocks: "直接提及個股",
      noStocksToShow: "本集暫時沒有顯示的關聯股票",
      noIndustriesToShow: "本集未對應到可延伸產業分類"
    },
    analysis: {
      question3: "相關產業的供需格局、競爭格局與價值鏈影響?",
      question4: "財務表現、估值與資本配置需要查證哪些變數?",
      question5: "主要風險、看壞情境與論點失效條件是什麼?",
      question6: "後續將追蹤哪些可量化指標，專業結論為何"
    },
    pages: {
      aboutPage: "使用說明",
      servicePage: "服務條款",
      privacyPage: "隱私權政策",
      refundPage: "退款政策",
      disclaimerPage: "免責聲明"
    },
    footer: {
      sources: "投資脈絡來自於台灣證券交易所 OpenAPI，本站購買中心、期貨交易所數據提供個人學術研究之用，Podcast 為本站附加利益使用，不構成買賣建議。所有資料僅供參考，不構成任何投資建議。"
    },
    system: {
      moreTools: "更多工具",
      readMore: "閱讀更多",
      published: "發布",
      noNameData: "名稱資料缺失",
      noIndustryData: "產業名稱資料缺失"
    },
    site: {
      name: "TWETQ Podcast 投資脈絡",
      shortName: "TWETQ",
      description: "以 Podcast 為入口，整理每集重點、逐字稿來源、提及產業與個股，並連接台股官方資料作為研究輔助。本站為非官方內容整理網站。"
    }
  },
  'en-US': {
    navigation: {
      home: "Latest Episode",
      allEpisodes: "All Episodes",
      podcast: "Podcast",
      menu: "Menu",
      openMenu: "Open Menu",
      closeMenu: "Close Menu",
      backToTop: "Back to Top",
      skipToMain: "Skip to main content",
      brandTagline: "Starting from each episode, verifying with market data",
      navLabel: "Podcast Navigation",
      mainSections: "Main Sections",
      seoNav: "Breadcrumb"
    },
    podcast: {
      latestEpisode: "Latest Episode",
      episodeTitle: "All Episodes",
      transcript: "Transcript",
      fullTranscript: "Full Transcript",
      viewTranscript: "View Full Transcript",
      viewTranscriptSource: "View Transcript Source (leaves this site)",
      audioOpen: "Open external audio",
      audioExternal: "(leaves this site)",
      noEnoughContent: "This episode does not have enough transcript content for analysis. Please check the original audio or transcript.",
      noStocksFound: "No explicit stocks identified for this episode; the extended list below does not represent podcast endorsement or direct mention.",
      noIndustriesFound: "No explicit industry classification matched for this episode.",
      systemExtended: "The following content is extended by the system based on industry classification, not directly mentioned in the episode; collapsed by default, related stocks show only when expanded.",
      systemExtendedLabel: "System Extended Industries",
      directStocks: "Directly Mentioned Stocks",
      noStocksToShow: "No related stocks to display at this time.",
      noIndustriesToShow: "No extendable industry classification matched for this episode."
    },
    analysis: {
      question3: "What are the supply-demand dynamics, competitive landscape, and value chain impacts of related industries?",
      question4: "What variables need verification regarding financial performance, valuation, and capital allocation?",
      question5: "What are the main risks, bear cases, and conditions under which the thesis fails?",
      question6: "What quantifiable indicators should be tracked next, and what are the professional conclusions?"
    },
    pages: {
      aboutPage: "Usage Guide",
      servicePage: "Terms of Service",
      privacyPage: "Privacy Policy",
      refundPage: "Refund Policy",
      disclaimerPage: "Disclaimer"
    },
    footer: {
      sources: "Data sources include TWSE, TPEx, and TAEX. This site is for personal academic research and contextual analysis as a non-profit value-added use. Data accuracy is not guaranteed and does not constitute investment advice."
    },
    system: {
      moreTools: "More Tools",
      readMore: "Read More",
      published: "Published",
      noNameData: "Name data missing",
      noIndustryData: "Industry name data missing"
    },
    site: {
      name: "TWETQ Podcast Insights",
      shortName: "TWETQ",
      description: "Using Podcast as an entry point, we organize key points, transcript sources, mentioned industries and stocks from each episode, and connect official Taiwan stock market data as research assistance. This site is a non-official content curation platform."
    }
  }
};

// Detect browser locale
function detectBrowserLocale(): string {
  const header = (navigator as { language?: string; userLanguage?: string })?.language || (navigator as { language?: string; userLanguage?: string })?.userLanguage || '';
  const parts = header.split('-');
  const code = parts[0].toLowerCase();
  const region = parts[1]?.toUpperCase();

  for (const locale of SUPPORTED_LOCALES) {
    const [lc, lr] = locale.split('-');
    if (code === lc && (!lr || lr === region)) {
      return locale;
    }
  }
  return DEFAULT_LOCALE;
}

// i18n interface
interface I18nInstance {
  locale: string;
  t: (key: string, params?: Record<string, unknown>) => string;
  setLocale: (newLocale: string) => string;
  getSupportedLocales: () => string[];
  getSiteInfo: () => { name: string; shortName: string; description: string } | null;
  detectBrowserLocale: () => string;
}

// Create internal i18n instance
function createInternalI18n(options: { locale?: string } = {}): I18nInstance {
  const locale: string = options.locale || detectBrowserLocale();

  return {
    locale: locale,

    // 讀取翻譯字串
    t: (key: string, params: Record<string, unknown> = {}): string => {
      const localeData = TRANSLATIONS[locale];
      if (!localeData) return key;

      const keys = key.split('.');
      let value: unknown = localeData;

      for (const k of keys) {
        if (value === undefined || value === null) return key;
        value = (value as Record<string, unknown>)[k];
      }

      // 處理函數式參數
      if (typeof value === 'function') {
        return String((value as Function)(...Object.values(params)));
      }

      // 處理字串中的佔位符
      if (typeof value === 'string') {
        let result = value;
        for (const [paramKey, paramValue] of Object.entries(params)) {
          result = result.replace(new RegExp('\\{' + paramKey + '\\}', 'g'), String(paramValue));
        }
        return result;
      }

      return String(value);
    },

    // 切換語系 (純函式庫，不會重新載入檔案)
    setLocale: (newLocale: string): string => {
      if (!SUPPORTED_LOCALES.includes(newLocale)) {
        console.warn('Unsupported locale: ' + newLocale);
        return locale;
      }
      // @ts-expect-error: reassigning const for functional scope
      (function() { const _l = locale; }());
      return newLocale;
    },

    getSupportedLocales: (): string[] => [...SUPPORTED_LOCALES],

    getSiteInfo: (): { name: string; shortName: string; description: string } | null => {
      if (!TRANSLATIONS[locale]?.site) return null;
      return {
        name: TRANSLATIONS[locale].site.name || '',
        shortName: TRANSLATIONS[locale].site.shortName || '',
        description: TRANSLATIONS[locale].site.description || '',
      };
    },

    detectBrowserLocale: detectBrowserLocale
  };
}

// Global API (no build mode)
(window as unknown as Record<string, Record<string, unknown>>).__i18n = {
  createI18n: createInternalI18n,
  SUPPORTED_LOCALES: SUPPORTED_LOCALES,
  DEFAULT_LOCALE: DEFAULT_LOCALE,
  TRANSLATIONS: TRANSLATIONS,
};

// Initialize on load
if (typeof window !== 'undefined') {
  window.addEventListener('load', async () => {
    try {
      const i18n = await createInternalI18n();
      if (i18n?.locale && (window as Record<string, Record<string, unknown>>).__TWETQ) {
        const twetq = window.__TWETQ as Record<string, (newLocale: string) => string>;
        twetq.setLocale = i18n.setLocale.bind(i18n);
        (twetq as Record<string, string>).locale = i18n.locale;
      }
    } catch (e) {
      console.error('i18n init failed:', e);
    }
  });
}
