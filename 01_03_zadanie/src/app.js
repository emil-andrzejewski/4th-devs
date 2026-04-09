
import { createServer } from "node:http";
import { createAgent } from "./agent.js";
import { server } from "./config.js";
import { HttpError, isNonEmptyString, parseJsonBody, sendJson } from "./io.js";

const log = (event, details = {}) => {
  const ts = new Date().toISOString();
  console.log(`[proxy] ${ts} ${event} ${JSON.stringify(details)}`);
};

const agent = createAgent({ log });

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
  const httpServer = createHttpServer();
  await new Promise((resolve) => {
    httpServer.listen(server.port, server.host, resolve);
  });

  log("server.started", {
    host: server.host,
    port: server.port,
    endpoint: `http://${server.host}:${server.port}/`
  });
};

main().catch((error) => {
  log("startup.error", { error: error.message });
  process.exit(1);
});

