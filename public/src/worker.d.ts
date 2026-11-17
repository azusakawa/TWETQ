declare function parseInlineXbrlFacts(html: str): unknown[];
declare function mergeOfficialMopsHistory(current: object, history: object): {
    source: string;
    incomeQuarters: any;
    balanceQuarters: any;
    latest: any;
    fourQuarterAgo: any;
    ttmParentNetIncome: any;
    roeQuarters: any;
    warnings: any[];
};
declare var worker_default: {
    fetch(request: any, env: any): Promise<Response>;
};
export { mergeOfficialMopsHistory, parseInlineXbrlFacts, worker_default as default };
//# sourceMappingURL=worker.d.ts.map