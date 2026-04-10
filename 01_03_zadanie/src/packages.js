const ensureNonEmptyString = (value, fieldName) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Field "${fieldName}" must be a non-empty string.`);
  }

  return value.trim();
};

const INTERNAL_TOOL_FIELDS = new Set([
  "operatorSessionId",
  "reactorHint",
  "reactorHintSource"
]);

const DEFAULT_PARAMETERS_SCHEMA = {
  type: "object",
  properties: {},
  required: [],
  additionalProperties: false
};

const cloneValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(cloneValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, cloneValue(nested)])
    );
  }

  return value;
};

const sanitizeSchemaForLlm = (schema) => {
  if (!schema || typeof schema !== "object") {
    return cloneValue(DEFAULT_PARAMETERS_SCHEMA);
  }

  const base = cloneValue(schema);
  delete base.$schema;

  if (base.type !== "object" || !base.properties || typeof base.properties !== "object") {
    return cloneValue(DEFAULT_PARAMETERS_SCHEMA);
  }

  const properties = Object.fromEntries(
    Object.entries(base.properties).filter(([key]) => !INTERNAL_TOOL_FIELDS.has(key))
  );

  const required = Array.isArray(base.required)
    ? base.required.filter((key) => !INTERNAL_TOOL_FIELDS.has(key))
    : [];

  return {
    ...base,
    type: "object",
    properties,
    required,
    additionalProperties: false
  };
};

export const mapMcpToolsToLlmTools = (mcpTools) => {
  if (!Array.isArray(mcpTools)) {
    return [];
  }

  return mcpTools
    .filter((tool) => tool && typeof tool.name === "string" && tool.name.trim())
    .map((tool) => ({
      type: "function",
      name: tool.name.trim(),
      description: typeof tool.description === "string" ? tool.description : "",
      parameters: sanitizeSchemaForLlm(tool.inputSchema),
      strict: true
    }));
};

const getHintForPackage = (sessionState, packageId) => {
  const packageMeta = sessionState.packages.get(packageId);
  return {
    reactorHint: Boolean(packageMeta?.hintedReactor),
    reactorHintSource: packageMeta?.hintSource ?? "none"
  };
};

const callPackagesMcpTool = async ({ mcpClient, toolName, payload, sessionID, log }) => {
  log("tool.mcp.call", {
    sessionID,
    tool: toolName,
    payload
  });

  const result = await mcpClient.callTool(toolName, payload);

  log("tool.mcp.result", {
    sessionID,
    tool: toolName,
    result
  });

  return result;
};

export const createPackageToolHandlers = ({
  sessionState,
  operatorSessionId,
  log,
  mcpClient
}) => ({
  async check_package(args) {
    const packageid = ensureNonEmptyString(args?.packageid, "packageid");
    const hint = getHintForPackage(sessionState, packageid);

    return callPackagesMcpTool({
      mcpClient,
      toolName: "check_package",
      payload: {
        packageid,
        operatorSessionId,
        ...hint
      },
      sessionID: operatorSessionId,
      log
    });
  },

  async redirect_package(args) {
    const packageid = ensureNonEmptyString(args?.packageid, "packageid");
    const destination = ensureNonEmptyString(args?.destination, "destination");
    const code = ensureNonEmptyString(args?.code, "code");
    const hint = getHintForPackage(sessionState, packageid);

    return callPackagesMcpTool({
      mcpClient,
      toolName: "redirect_package",
      payload: {
        packageid,
        destination,
        code,
        operatorSessionId,
        ...hint
      },
      sessionID: operatorSessionId,
      log
    });
  },

  async unknown_tool(args, toolName) {
    return callPackagesMcpTool({
      mcpClient,
      toolName,
      payload: args ?? {},
      sessionID: operatorSessionId,
      log
    });
  }
});

export const formatToolOutput = (callId, data) => ({
  type: "function_call_output",
  call_id: callId,
  output: JSON.stringify(data)
});
