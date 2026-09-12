import { access, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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

const projectDir = fileURLToPath(new URL("..", import.meta.url));
const dataParentDir = join(projectDir, "public", "data");
const outputDir = join(dataParentDir, "tpex");
const lastGoodDir = join(projectDir, ".last-good", "tpex");
const dryRun = process.env.TPEX_REFRESH_DRY_RUN === "1";
const dateFields = ["Date", "出表日期", "ExRrightsExDividendDate"];

function parseDataDate(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  let year;
  let month;
  let day;

  if (digits.length === 8) {
    year = Number(digits.slice(0, 4));
    month = Number(digits.slice(4, 6));
    day = Number(digits.slice(6, 8));
  } else if (digits.length === 7) {
    year = Number(digits.slice(0, 3)) + 1911;
    month = Number(digits.slice(3, 5));
    day = Number(digits.slice(5, 7));
  } else {
    return null;
  }

  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }
  return parsed;
}

function latestDataDate(rows) {
  let latest = null;
  for (const row of rows) {
    for (const field of dateFields) {
      const parsed = parseDataDate(row?.[field]);
      if (parsed && (!latest || parsed > latest)) latest = parsed;
    }
  }
  return latest;
}

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function loadLastGood(endpoint) {
  const path = join(outputDir, `${endpoint}.json`);
  try {
    const rows = JSON.parse(await readFile(path, "utf8"));
    return Array.isArray(rows) && rows.length > 0 ? rows : null;
  } catch {
    return null;
  }
}

function validateRows(endpoint, rows, minimumRows, maxAgeDays, previousRows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`${endpoint} must be a non-empty JSON array`);
  }

  const previousMinimum = previousRows ? Math.ceil(previousRows.length * 0.5) : 0;
  const requiredRows = Math.max(minimumRows, previousMinimum);
  if (rows.length < requiredRows) {
    throw new Error(`${endpoint} has ${rows.length} rows; expected at least ${requiredRows}`);
  }

  const latest = latestDataDate(rows);
  if (!latest) {
    throw new Error(`${endpoint} has no parseable Date value`);
  }

  const futureAllowanceDays = endpoint === "tpex_exright_prepost" ? 366 : 1;
  const latestAllowed = Date.now() + futureAllowanceDays * 24 * 60 * 60 * 1_000;
  if (latest.getTime() > latestAllowed) {
    throw new Error(`${endpoint} latest Date ${latest.toISOString().slice(0, 10)} is in the future`);
  }

  const previousLatest = previousRows ? latestDataDate(previousRows) : null;
  if (endpoint !== "tpex_exright_prepost" && previousLatest && latest < previousLatest) {
    throw new Error(
      `${endpoint} latest Date regressed from ${previousLatest.toISOString().slice(0, 10)} ` +
        `to ${latest.toISOString().slice(0, 10)}`,
    );
  }

  if (maxAgeDays !== undefined) {
    const ageDays = (Date.now() - latest.getTime()) / (24 * 60 * 60 * 1_000);
    if (ageDays > maxAgeDays) {
      throw new Error(
        `${endpoint} latest Date ${latest.toISOString().slice(0, 10)} is ${Math.floor(ageDays)} days old`,
      );
    }
  }

  return latest;
}

async function replaceOutputDirectory(stagedDir) {
  await mkdir(dirname(lastGoodDir), { recursive: true });
  let hasCurrent = await pathExists(outputDir);
  if (!hasCurrent && (await pathExists(lastGoodDir))) {
    await rename(lastGoodDir, outputDir);
    hasCurrent = true;
    console.warn(`Recovered interrupted refresh from ${lastGoodDir}.`);
  }

  if (await pathExists(lastGoodDir)) {
    await rm(lastGoodDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
  }

  if (hasCurrent) await rename(outputDir, lastGoodDir);

  try {
    await rename(stagedDir, outputDir);
  } catch (error) {
    if (hasCurrent && !(await pathExists(outputDir)) && (await pathExists(lastGoodDir))) {
      try {
        await rename(lastGoodDir, outputDir);
      } catch (restoreError) {
        throw new AggregateError(
          [error, restoreError],
          `TPEx refresh failed and last-good restore also failed; recover ${lastGoodDir}`,
        );
      }
    }
    throw error;
  }
}

await mkdir(dataParentDir, { recursive: true });
const stagedDir = await mkdtemp(join(dataParentDir, ".tpex-refresh-"));

try {
  for (const [endpoint, minimumRows, maxAgeDays] of endpoints) {
    const url = `https://www.tpex.org.tw/openapi/v1/${endpoint}`;
    const response = await fetch(url, {
      headers: {
        accept: "application/json,text/plain,*/*",
        "accept-language": "zh-TW,zh;q=0.9,en;q=0.8",
        "user-agent": "Mozilla/5.0",
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      throw new Error(`${endpoint} HTTP ${response.status}`);
    }

    const text = await response.text();
    let rows;
    try {
      rows = JSON.parse(text);
    } catch (error) {
      throw new Error(`${endpoint} returned invalid JSON`, { cause: error });
    }

    const previousRows = await loadLastGood(endpoint);
    const latest = validateRows(endpoint, rows, minimumRows, maxAgeDays, previousRows);
    await writeFile(join(stagedDir, `${endpoint}.json`), text, "utf8");
    console.log(
      `${endpoint}: ${rows.length} rows, ${Buffer.byteLength(text)} bytes, latest=${latest.toISOString().slice(0, 10)}`,
    );
  }

  if (dryRun) {
    console.log(`Validated ${endpoints.length} TPEx endpoints; dry run left ${outputDir} unchanged.`);
  } else {
    await replaceOutputDirectory(stagedDir);
    console.log(`Replaced ${outputDir}; previous data retained at ${lastGoodDir}.`);
  }
} finally {
  await rm(stagedDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
}
