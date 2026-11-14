/**
 * TPEx Data Refresh Script - TypeScript 版本
 * 从 TPEx 和 MOPS 刷新台股数据
 */
interface EndpointResult {
    data: unknown;
    date: string;
}
declare const endpoints: [string, number, number?][];
declare function fetchEndpointData(endpoint: [string, number, number?]): Promise<EndpointResult>;
declare function main(): Promise<void>;
export { endpoints, fetchEndpointData, main };
//# sourceMappingURL=refresh-tpex-data.d.ts.map