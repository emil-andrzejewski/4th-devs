import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { mcp } from "../config.js";

const parseToolResult = (result) => {
  const textPart = result.content?.find((entry) => entry?.type === "text");

  if (!textPart?.text) {
    return result;
  }

  try {
    return JSON.parse(textPart.text);
  } catch {
    return textPart.text;
  }
};

export const createPackagesMcpClient = async ({ log }) => {
  const client = new Client(
    { name: "proxy-packages-client", version: "1.0.0" },
    { capabilities: {} }
  );

  const transport = new StreamableHTTPClientTransport(new URL(mcp.packagesUrl));
  await client.connect(transport);

  log("mcp.client.connected", {
    url: mcp.packagesUrl,
    sessionId: transport.sessionId ?? null
  });

  const callTool = async (name, args) => {
    const result = await client.callTool({ name, arguments: args });
    const parsed = parseToolResult(result);

    if (result.isError) {
      const message =
        typeof parsed === "string"
          ? parsed
          : parsed?.error ?? `MCP tool ${name} failed`;
      throw new Error(message);
    }

    return parsed;
  };

  const listTools = async () => {
    const result = await client.listTools();
    return result.tools ?? [];
  };

  const close = async () => {
    try {
      if (typeof client.close === "function") {
        await client.close();
      } else {
        await transport.close();
      }
      log("mcp.client.closed", { url: mcp.packagesUrl });
    } catch (error) {
      log("mcp.client.close_error", { error: error.message });
    }
  };

  return {
    callTool,
    listTools,
    close
  };
};
