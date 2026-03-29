/**
 * MCP Client — connects to a server over stdio, declares capabilities.
 *
 * In MCP, the client is the host application (like Claude Desktop or Cursor).
 * It spawns the server as a subprocess and communicates via stdin/stdout.
 *
 * This client declares two capabilities the server can use:
 *  - sampling:     server can ask the client to call an LLM
 *  - elicitation:  server can ask the client for structured user input
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import {
  CreateMessageRequestSchema,
  ElicitRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { createSamplingHandler } from "./sampling.js";
import { createElicitationHandler } from "./elicitation.js";
import { clientLog } from "./log.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const isTruthy = (value) => ["1", "true", "yes", "on"].includes(String(value).toLowerCase());

const toDebugMode = (value) => (String(value).toLowerCase() === "inspect" ? "inspect" : "inspect-brk");

const toDebugPort = (value) => {
  const port = Number(value);
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : 9230;
};

const resolveServerDebugArg = ({ debugServer, debugMode, debugPort } = {}) => {
  const enabled = debugServer ?? isTruthy(process.env.MCP_SERVER_INSPECT);
  if (!enabled) return null;

  const mode = toDebugMode(debugMode ?? process.env.MCP_SERVER_INSPECT_MODE ?? "brk");
  const port = toDebugPort(debugPort ?? process.env.MCP_SERVER_INSPECT_PORT ?? "9230");

  return `--${mode}=127.0.0.1:${port}`;
};

/**
 * @param {object} options
 * @param {string} options.model — model for sampling completions
 * @param {string} options.serverPath — path to server script (default: ./server.js)
 * @param {function} options.onElicitation — custom elicitation handler (default: auto-accept)
 * @param {boolean} options.debugServer — enable Node inspector for spawned server
 * @param {"inspect"|"brk"|"inspect-brk"} options.debugMode — inspector mode (default: brk)
 * @param {number|string} options.debugPort — inspector port (default: 9230)
 */
export const createMcpClient = async ({
  model,
  serverPath,
  onElicitation,
  debugServer,
  debugMode,
  debugPort
} = {}) => {
  const client = new Client(
    { name: "mcp-core-client", version: "1.0.0" },
    {
      capabilities: {
        sampling: {},
        elicitation: { form: {} }
      }
    }
  );

  // Register handlers for server-initiated requests
  client.setRequestHandler(CreateMessageRequestSchema, createSamplingHandler(model));
  client.setRequestHandler(ElicitRequestSchema, createElicitationHandler({ onElicitation }));

  // Spawn the server as a child process and connect over stdio
  const resolvedPath = serverPath || join(__dirname, "server.js");
  const debugArg = resolveServerDebugArg({ debugServer, debugMode, debugPort });
  const serverArgs = debugArg ? [debugArg, resolvedPath] : [resolvedPath];

  clientLog.spawningServer(resolvedPath);
  if (debugArg) clientLog.serverDebugEnabled(debugArg);

  const transport = new StdioClientTransport({
    command: "node",
    args: serverArgs,
    stderr: "inherit"
  });

  await client.connect(transport);
  clientLog.connected();

  return client;
};
