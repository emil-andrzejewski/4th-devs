import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIRNAME = path.dirname(fileURLToPath(import.meta.url));
const NODE_BIN = process.execPath;
const DEFAULT_MCP_HOST = "127.0.0.1";
const DEFAULT_MCP_PORT = 3101;
const DEFAULT_MCP_PATH = "/mcp";
const STARTUP_TIMEOUT_MS = 20_000;
const HEALTH_RETRY_DELAY_MS = 250;

const log = (event, details = {}) => {
  const ts = new Date().toISOString();
  console.log(`[all] ${ts} ${event} ${JSON.stringify(details)}`);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const toPositiveInt = (value, fallback) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const normalizeHttpPath = (value, fallback) => {
  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
};

const resolvePackagesMcpUrl = () => {
  if (process.env.PACKAGES_MCP_URL) {
    return process.env.PACKAGES_MCP_URL;
  }

  const host = process.env.PACKAGES_MCP_HOST || DEFAULT_MCP_HOST;
  const port = toPositiveInt(process.env.PACKAGES_MCP_PORT, DEFAULT_MCP_PORT);
  const mcpPath = normalizeHttpPath(process.env.PACKAGES_MCP_PATH, DEFAULT_MCP_PATH);
  return `http://${host}:${port}${mcpPath}`;
};

const resolveMcpHealthUrl = () => {
  const configuredUrl = resolvePackagesMcpUrl();
  const parsed = new URL(configuredUrl);
  return new URL("/health", parsed).toString();
};

const waitForHealthyMcp = async (healthUrl) => {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(healthUrl);
      if (response.ok) {
        const payload = await response.json().catch(() => null);
        if (payload?.ok) {
          log("mcp.healthy", { healthUrl });
          return;
        }
      }
    } catch {
      // MCP may still be booting.
    }

    await sleep(HEALTH_RETRY_DELAY_MS);
  }

  throw new Error(`MCP health check timeout after ${STARTUP_TIMEOUT_MS}ms (${healthUrl})`);
};

const spawnService = (name, scriptPath) => {
  const child = spawn(NODE_BIN, [scriptPath], {
    cwd: DIRNAME,
    stdio: "inherit",
    env: process.env
  });

  child.on("error", (error) => {
    log("service.error", { name, error: error.message });
  });

  return child;
};

let shuttingDown = false;
let mcpProcess = null;
let proxyProcess = null;

const requestShutdown = (reason, exitCode = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  log("shutdown.requested", { reason, exitCode });

  for (const processRef of [proxyProcess, mcpProcess]) {
    if (processRef && !processRef.killed) {
      processRef.kill("SIGTERM");
    }
  }

  setTimeout(() => {
    process.exit(exitCode);
  }, 200);
};

const wireExit = (name, child) => {
  child.on("exit", (code, signal) => {
    log("service.exit", {
      name,
      code: code ?? null,
      signal: signal ?? null
    });

    if (!shuttingDown) {
      const normalizedExitCode = code === 0 ? 0 : (code ?? 1);
      requestShutdown(`${name} exited`, normalizedExitCode);
    }
  });
};

process.on("SIGINT", () => requestShutdown("SIGINT", 0));
process.on("SIGTERM", () => requestShutdown("SIGTERM", 0));

const main = async () => {
  const mcpHealthUrl = resolveMcpHealthUrl();
  log("startup.begin", { mcpHealthUrl });

  mcpProcess = spawnService("mcp", "./mcp-server.js");
  wireExit("mcp", mcpProcess);

  await waitForHealthyMcp(mcpHealthUrl);

  proxyProcess = spawnService("proxy", "./app.js");
  wireExit("proxy", proxyProcess);

  log("startup.complete", {});
};

main().catch((error) => {
  log("startup.error", { error: error.message });
  requestShutdown("startup.error", 1);
});
