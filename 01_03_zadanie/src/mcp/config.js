import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const DIRNAME = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = path.resolve(DIRNAME, "../..");
const ROOT_DIR = path.resolve(PROJECT_DIR, "..");
const ROOT_ENV_FILE = path.join(ROOT_DIR, ".env");

if (existsSync(ROOT_ENV_FILE) && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(ROOT_ENV_FILE);
}

const toNonEmpty = (value) => (typeof value === "string" ? value.trim() : "");
const toPositiveInt = (value, fallback) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const ag3ntsApiKey = toNonEmpty(process.env.AG3NTS_API_KEY);
if (!ag3ntsApiKey) {
  throw new Error("Missing AG3NTS_API_KEY in root .env");
}

export const mcpServerConfig = {
  host: toNonEmpty(process.env.PACKAGES_MCP_HOST) || "127.0.0.1",
  port: toPositiveInt(process.env.PACKAGES_MCP_PORT, 3101),
  path: toNonEmpty(process.env.PACKAGES_MCP_PATH) || "/mcp",
  maxBodyBytes: toPositiveInt(process.env.PACKAGES_MCP_MAX_BODY_BYTES, 256 * 1024)
};

export const hub = {
  packagesEndpoint: "https://hub.ag3nts.org/api/packages",
  timeoutMs: toPositiveInt(process.env.HUB_TIMEOUT_MS, 30_000),
  retries: toPositiveInt(process.env.HUB_RETRIES, 3),
  retryDelayMs: toPositiveInt(process.env.HUB_RETRY_DELAY_MS, 700)
};

export const mission = {
  hiddenDestinationCode: "PWR6132PL"
};

export const auth = {
  ag3ntsApiKey
};
