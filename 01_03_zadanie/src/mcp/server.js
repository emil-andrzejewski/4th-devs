import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { mcpServerConfig } from "./config.js";
import { mcpLog } from "./logger.js";
import { registerPackageTools } from "./tools.js";

const MCP_SESSION_HEADER = "mcp-session-id";

const mcpServer = new McpServer(
  { name: "packages-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

registerPackageTools({ server: mcpServer, log: mcpLog });

const transports = new Map();
const connectedTransports = new WeakSet();

const sendJsonRpcError = (res, status, code, message) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(`${JSON.stringify({
    jsonrpc: "2.0",
    error: { code, message },
    id: null
  })}\n`);
};

const sendJson = (res, status, data) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(`${JSON.stringify(data)}\n`);
};

const readJsonBody = async (req) => {
  let totalBytes = 0;
  const chunks = [];

  for await (const chunk of req) {
    totalBytes += chunk.length;
    if (totalBytes > mcpServerConfig.maxBodyBytes) {
      throw new Error("Request body too large");
    }
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return undefined;
  }

  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : undefined;
};

const ensureConnected = async (transport) => {
  if (!connectedTransports.has(transport)) {
    await mcpServer.connect(transport);
    connectedTransports.add(transport);
  }
};

const getSessionIdHeader = (req) => {
  const headerValue = req.headers[MCP_SESSION_HEADER];
  if (!headerValue) return undefined;
  return Array.isArray(headerValue) ? headerValue[0] : headerValue;
};

const handlePost = async (req, res, body) => {
  const sessionIdHeader = getSessionIdHeader(req);
  const jsonrpcMethod = body?.method;
  const isInitialize = jsonrpcMethod === "initialize";

  mcpLog("mcp.request", {
    method: "POST",
    sessionId: sessionIdHeader ?? null,
    jsonrpcMethod: jsonrpcMethod ?? null,
    isInitialize
  });

  let transport = sessionIdHeader ? transports.get(sessionIdHeader) : undefined;

  if (!transport) {
    if (!isInitialize) {
      sendJsonRpcError(res, 400, -32000, "Bad Request: No valid session ID provided");
      return;
    }

    let createdTransport = null;

    createdTransport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        transports.set(sessionId, createdTransport);
        mcpLog("mcp.session.initialized", { sessionId });
      }
    });

    createdTransport.onclose = () => {
      const sid = createdTransport.sessionId;
      if (sid) {
        transports.delete(sid);
        mcpLog("mcp.session.closed", { sessionId: sid });
      }
    };

    transport = createdTransport;
  }

  await ensureConnected(transport);
  await transport.handleRequest(req, res, body);
};

const handleGet = async (req, res) => {
  const sessionIdHeader = getSessionIdHeader(req);
  mcpLog("mcp.request", {
    method: "GET",
    sessionId: sessionIdHeader ?? null
  });

  if (!sessionIdHeader) {
    sendJsonRpcError(res, 405, -32000, "Method not allowed - no session");
    return;
  }

  const transport = transports.get(sessionIdHeader);
  if (!transport) {
    sendJson(res, 404, { error: "Invalid session" });
    return;
  }

  await ensureConnected(transport);
  await transport.handleRequest(req, res);
};

const handleDelete = async (req, res) => {
  const sessionIdHeader = getSessionIdHeader(req);
  mcpLog("mcp.request", {
    method: "DELETE",
    sessionId: sessionIdHeader ?? null
  });

  if (!sessionIdHeader) {
    sendJsonRpcError(res, 405, -32000, "Method not allowed - no session");
    return;
  }

  const transport = transports.get(sessionIdHeader);
  if (!transport) {
    sendJson(res, 404, { error: "Invalid session" });
    return;
  }

  await ensureConnected(transport);
  await transport.handleRequest(req, res);
  transports.delete(sessionIdHeader);
  await transport.close();
};

const httpServer = createServer(async (req, res) => {
  const requestUrl = new URL(req.url ?? "/", "http://localhost");
  const path = requestUrl.pathname;

  try {
    if (req.method === "GET" && path === "/health") {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (path !== mcpServerConfig.path) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }

    if (req.method === "POST") {
      let body;
      try {
        body = await readJsonBody(req);
      } catch (error) {
        sendJsonRpcError(res, 400, -32700, `Invalid JSON payload: ${error.message}`);
        return;
      }

      await handlePost(req, res, body);
      return;
    }

    if (req.method === "GET") {
      await handleGet(req, res);
      return;
    }

    if (req.method === "DELETE") {
      await handleDelete(req, res);
      return;
    }

    sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    mcpLog("mcp.error", {
      message: "Unhandled MCP HTTP error",
      error: error.message
    });
    sendJsonRpcError(res, 500, -32603, "Internal server error");
  }
});

const start = async () => {
  await new Promise((resolve) => {
    httpServer.listen(mcpServerConfig.port, mcpServerConfig.host, resolve);
  });

  mcpLog("mcp.server.started", {
    host: mcpServerConfig.host,
    port: mcpServerConfig.port,
    path: mcpServerConfig.path
  });
};

const shutdown = async (signal) => {
  mcpLog("mcp.server.shutdown", { signal });

  for (const [sessionId, transport] of transports.entries()) {
    try {
      await transport.close();
      mcpLog("mcp.session.closed", { sessionId });
    } catch (error) {
      mcpLog("mcp.error", {
        message: "Error while closing transport",
        sessionId,
        error: error.message
      });
    }
  }

  transports.clear();
  await new Promise((resolve) => httpServer.close(() => resolve()));
  process.exit(0);
};

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

start().catch((error) => {
  mcpLog("mcp.startup.error", { error: error.message });
  process.exit(1);
});
