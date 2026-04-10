
import { createServer } from "node:http";
import { createAgent } from "./agent.js";
import { server } from "./config.js";
import { HttpError, isNonEmptyString, parseJsonBody, sendJson } from "./io.js";
import { createPackagesMcpClient } from "./mcp/client.js";
import { mapMcpToolsToLlmTools } from "./packages.js";

const log = (event, details = {}) => {
  const ts = new Date().toISOString();
  console.log(`[proxy] ${ts} ${event} ${JSON.stringify(details)}`);
};

let agent = null;
let packagesMcpClient = null;
let httpServer = null;

const ensureRequiredMcpTools = async (client) => {
  const tools = await client.listTools();
  const available = new Set(tools.map((tool) => tool.name));
  const required = ["check_package", "redirect_package"];
  const missing = required.filter((tool) => !available.has(tool));

  if (missing.length > 0) {
    throw new Error(`Packages MCP is missing required tools: ${missing.join(", ")}`);
  }

  const llmTools = mapMcpToolsToLlmTools(tools);
  log("mcp.tools.ready", {
    mcpTools: tools.map((tool) => tool.name),
    llmTools: llmTools.map((tool) => tool.name)
  });

  return llmTools;
};

const validatePayload = (payload) => {
  if (!payload || typeof payload !== "object") {
    throw new HttpError(400, "Payload must be a JSON object");
  }

  if (!isNonEmptyString(payload.sessionID)) {
    throw new HttpError(400, 'Field "sessionID" must be a non-empty string');
  }

  if (!isNonEmptyString(payload.msg)) {
    throw new HttpError(400, 'Field "msg" must be a non-empty string');
  }
};

const handleRootPost = async (req, res) => {
  if (!agent) {
    throw new HttpError(503, "Proxy is not ready yet");
  }

  const payload = await parseJsonBody(req, { maxBytes: server.maxBodyBytes });
  validatePayload(payload);

  const sessionID = payload.sessionID.trim();
  const msg = payload.msg.trim();

  const responseText = await agent.processOperatorMessage({ sessionID, msg });
  log("operator.response", { sessionID, msg: responseText });
  sendJson(res, 200, { msg: responseText });
};

const createHttpServer = () =>
  createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url ?? "/", "http://localhost");
      const path = requestUrl.pathname;

      log("http.request", {
        method: req.method,
        path,
        remoteAddress: req.socket.remoteAddress
      });

      if (req.method === "GET" && path === "/health") {
        sendJson(res, 200, { ok: true });
        return;
      }

      if (req.method === "POST" && path === "/") {
        await handleRootPost(req, res);
        return;
      }

      sendJson(res, 404, { error: "Not found" });
    } catch (error) {
      if (error instanceof HttpError) {
        sendJson(res, error.status, { error: error.message });
        return;
      }

      log("http.error", { error: error.message });
      sendJson(res, 500, { error: "Internal server error" });
    }
  });

const main = async () => {
  packagesMcpClient = await createPackagesMcpClient({ log });
  const llmTools = await ensureRequiredMcpTools(packagesMcpClient);
  agent = createAgent({ log, mcpClient: packagesMcpClient, llmTools });

  httpServer = createHttpServer();
  await new Promise((resolve) => {
    httpServer.listen(server.port, server.host, resolve);
  });

  log("server.started", {
    host: server.host,
    port: server.port,
    endpoint: `http://${server.host}:${server.port}/`
  });
};

const shutdown = async (signal) => {
  log("server.shutdown", { signal });

  if (httpServer) {
    await new Promise((resolve) => httpServer.close(() => resolve()));
    log("server.http.closed");
  }

  if (packagesMcpClient) {
    await packagesMcpClient.close();
  }

  process.exit(0);
};

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

main().catch((error) => {
  log("startup.error", { error: error.message });
  process.exit(1);
});
