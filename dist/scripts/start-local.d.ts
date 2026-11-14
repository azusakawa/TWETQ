/**
 * TWETQ Local Server - TypeScript 版本
 * 本地开发服务器，提供静态资产和 API 代理
 */
import { IncomingMessage, ServerResponse } from "node:http";
import { DatabaseSync } from "node:sqlite";
interface QueryOperation {
    bind(...nextValues: (string | number | boolean | null | undefined)[]): QueryOperation;
    first(): Record<string, unknown> | null;
    all(): {
        results: Record<string, unknown>[];
        success: true;
    };
    run(): {
        success: true;
        meta: {
            changes: number;
            last_row_id: number;
        };
    };
}
interface DatabaseBinding {
    prepare(sql: string): QueryOperation;
    batch(statements: QueryOperation[]): {
        success: true;
        meta: {
            changes: number;
            last_row_id: number;
        };
    }[];
}
declare function createDatabaseBinding(database: DatabaseSync): DatabaseBinding;
declare function fetchAsset(request: Request): Promise<Response>;
declare function toRequest(request: IncomingMessage): Promise<Request>;
declare function writeResponse(nodeResponse: ServerResponse, response: Response): Promise<void>;
export { fetchAsset, createDatabaseBinding, toRequest, writeResponse };
//# sourceMappingURL=start-local.d.ts.map