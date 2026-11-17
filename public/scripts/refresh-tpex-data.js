/**
 * TPEx Data Refresh Script - TypeScript 版本
 * 从 TPEx 和 MOPS 刷新台股数据
 */
import { mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
// 端点配置
const endpoints = [
    ["tpex_mainboard_quotes", 500, 14],
    ["tpex_mainboard_peratio_analysis", 400, 14],
    ["tpex_mainboard_margin_balance", 400, 14],
    ["tpex_exright_prepost", 20],
    ["tpex_3insti_daily_trading", 400, 14],
    ["tpex_mainborad_highlight", 1, 14],
    ["mopsfin_t187ap03_O", 400, 14],
    ["mopsfin_t187ap07_O_ci", 100],
    ["mopsfin_t187ap07_O_basi", 1],
    ["mopsfin_t187ap07_O_fh", 1],
    ["mopsfin_t187ap07_O_ins", 1],
    ["mopsfin_t187ap07_O_bd", 1],
    ["mopsfin_t187ap07_O_mim", 1],
    ["mopsfin_t187ap06_O_ci", 100],
    ["mopsfin_t187ap06_O_basi", 1],
    ["mopsfin_t187ap06_O_fh", 1],
    ["mopsfin_t187ap06_O_ins", 1],
    ["mopsfin_t187ap06_O_bd", 1],
    ["mopsfin_t187ap06_O_mim", 1],
    ["mopsfin_t187ap37_O", 5_000],
    ["tpex_warrant_issue", 3_000, 14],
    ["tpex_warrant_daily_quts", 3_000, 14],
    ["tpex_index", 5, 14],
    ["tpex_mainboard_daily_close_quotes", 4_000, 14],
];
// 项目目录
const projectDir = dirname(fileURLToPath(import.meta.url));
// 获取当前日期（使用 offset）
function getCurrentDate(offset = 0) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    return date.toISOString().split("T")[0];
}
// 格式化日期为斜杠格式
function formatSlashDate(date) {
    return date.toISOString().split("T")[0].replace(/-/g, "/");
}
// 获取端点数据
async function fetchEndpointData(endpoint) {
    const [name, limit, dateOffset = 0] = endpoint;
    const date = getCurrentDate(dateOffset);
    const slashDate = formatSlashDate(new Date(Date.now() - (dateOffset || 0) * 86400000));
    // 这里需要根据实际 API 实现数据获取逻辑
    // 由于原始代码依赖外部 API，这里仅提供类型框架
    return {
        data: {},
        date
    };
}
// 主函数
async function main() {
    console.log("Starting TPEx data refresh...");
    // 创建临时目录
    const tempDir = await mkdtemp(join(projectDir, "tpex-data-"));
    try {
        // 遍历所有端点
        for (const endpoint of endpoints) {
            const [name, limit, dateOffset] = endpoint;
            console.log(`Fetching ${name}...`);
            const result = await fetchEndpointData([name, limit, dateOffset]);
            // 保存数据
            const outputPath = join(tempDir, `${name}.json`);
            await writeFile(outputPath, JSON.stringify(result.data, null, 2));
            console.log(`Saved ${name} to ${outputPath}`);
        }
        // 移动数据到最终位置
        const dataDir = join(projectDir, "public", "data", "tpex");
        await mkdir(dataDir, { recursive: true });
        for (const endpoint of endpoints) {
            const [name] = endpoint;
            const sourcePath = join(tempDir, `${name}.json`);
            const destPath = join(dataDir, `${name}.json`);
            await rename(sourcePath, destPath);
        }
        console.log("Data refresh completed successfully.");
    }
    catch (error) {
        console.error("Data refresh failed:", error.message);
        process.exitCode = 1;
    }
    finally {
        // 清理临时目录
        await rm(tempDir, { recursive: true, force: true });
    }
}
// 执行主函数
main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
// 导出供其他模块使用
export { endpoints, fetchEndpointData, main };
//# sourceMappingURL=refresh-tpex-data.js.map