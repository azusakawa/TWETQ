interface StagingQuote {
    code?: string;
    close?: number | string;
    change?: number | string;
    changePct?: number | string;
}
interface StagingStock {
    code?: string;
    name?: string;
    reason?: string;
}
interface StagingIndustry {
    name?: string;
    moneydjCategoryCode?: string;
}
interface StagingAnalysis {
    stocks?: StagingStock[];
    industries?: StagingIndustry[];
}
interface StagingData {
    source?: Record<string, unknown>;
    analysis?: StagingAnalysis;
}
interface StagingOptions {
    heading?: string;
    latest?: boolean;
    detailHref?: string;
    quotes?: Map<string, StagingQuote>;
}
declare const escapeHtml: (value: string | number | null | undefined) => string;
declare const routeMode: () => string;
declare function mountDesktopNavigation(): void;
declare function mountNavigation(): void;
declare function syncNavigation(): void;
declare function insertCover(target: Element | null, className?: string): void;
declare const episodeTitle: (source?: Record<string, unknown>) => string;
declare const episodeDate: (source?: Record<string, unknown>) => string;
declare function episodeHeroMarkup(data: StagingData, options?: StagingOptions): string;
declare const quoteText: (value: number | string | undefined) => string;
declare function contextPanel(data: StagingData, options?: StagingOptions): HTMLElement;
declare function researchIcon(kind: string): string;
declare function researchPanel({ latest }?: {
    latest?: boolean | undefined;
}): HTMLElement;
declare function enrichHome(root: Element): Promise<void>;
declare function enhanceDirectPodcast(root: Element): Promise<void>;
declare function enhancePodcast(root: Element): void;
declare function enhanceHelp(root: Element): void;
declare function enhanceScreen(root: Element): void;
declare function enhanceTerms(root: Element): void;
declare function updateTermsProgress(): void;
declare let queued: boolean;
declare function enhance(): void;
declare const queueEnhance: () => void;
//# sourceMappingURL=staging-reference.d.ts.map