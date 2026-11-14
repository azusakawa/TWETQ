declare const SUPPORTED_LOCALES: readonly string[];
declare const DEFAULT_LOCALE: string;
declare const TRANSLATIONS: Record<string, Record<string, Record<string, string>>>;
declare function detectBrowserLocale(): string;
interface I18nInstance {
    locale: string;
    t: (key: string, params?: Record<string, unknown>) => string;
    setLocale: (newLocale: string) => string;
    getSupportedLocales: () => string[];
    getSiteInfo: () => {
        name: string;
        shortName: string;
        description: string;
    } | null;
    detectBrowserLocale: () => string;
}
declare function createInternalI18n(options?: {
    locale?: string;
}): I18nInstance;
//# sourceMappingURL=i18n-loader.d.ts.map