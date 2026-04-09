import { llm } from "./config.js";
import { createResponse, extractResponseText, extractToolCalls } from "./llm.js";
import { createPackageToolHandlers, formatToolOutput, packageTools } from "./packages.js";

const parseToolArgs = (toolCall) => {
  try {
    return JSON.parse(toolCall.arguments ?? "{}");
  } catch {
    throw new Error(`Invalid JSON arguments for tool: ${toolCall.name}`);
  }
};

const createSessionState = () => ({
  messages: [],
  packages: new Map(),
  lastRedirect: null,
  createdAt: new Date().toISOString()
});

export const createAgent = ({ log }) => {
  const sessions = new Map();

  const getSession = (sessionID) => {
    if (!sessions.has(sessionID)) {
      sessions.set(sessionID, createSessionState());
      log("session.created", { sessionID });
    }

    return sessions.get(sessionID);
  };

  const runToolCalls = async ({ sessionID, sessionState, toolCalls }) => {
    const handlers = createPackageToolHandlers({ sessionState, log: (event, details) => log(event, { sessionID, ...details }) });
    const outputs = [];

    for (const toolCall of toolCalls) {
      try {
        const args = parseToolArgs(toolCall);
        log("tool.call", {
          sessionID,
          tool: toolCall.name,
          args
        });

        const handler = handlers[toolCall.name];
        if (!handler) {
          throw new Error(`Unknown tool: ${toolCall.name}`);
        }

        const result = await handler(args);
        outputs.push(formatToolOutput(toolCall.call_id, result));
      } catch (error) {
        log("tool.error", {
          sessionID,
          tool: toolCall.name,
          error: error.message
        });
        outputs.push(formatToolOutput(toolCall.call_id, { error: error.message }));
      }
    }

    return outputs;
  };

  const processOperatorMessage = async ({ sessionID, msg }) => {
    const sessionState = getSession(sessionID);
    sessionState.messages.push({ role: "user", content: msg });

    log("operator.message", { sessionID, msg, historySize: sessionState.messages.length });

    for (let round = 1; round <= llm.maxToolRounds; round += 1) {
      log("llm.request", { sessionID, round, historySize: sessionState.messages.length });
      const response = await createResponse({
        input: sessionState.messages,
        tools: packageTools
      });

      sessionState.messages.push(...(response.output ?? []));

      const toolCalls = extractToolCalls(response);
      if (toolCalls.length === 0) {
        const text = extractResponseText(response)
          ?? "Mamy chwilowy problem po stronie systemu. Sprobuj prosze za moment.";

        if (!response.output?.length) {
          sessionState.messages.push({ role: "assistant", content: text });
        }

        log("llm.response", {
          sessionID,
          round,
          text,
          outputItems: response.output?.length ?? 0
        });

        return text;
      }

      log("llm.tool_calls", {
        sessionID,
        round,
        toolCalls: toolCalls.map((call) => call.name)
      });

      const toolOutputs = await runToolCalls({ sessionID, sessionState, toolCalls });
      sessionState.messages.push(...toolOutputs);
    }

    const fallback =
      "Nie moge teraz domknac operacji w systemie. Daj mi chwile i ponow prosze polecenie.";
    sessionState.messages.push({ role: "assistant", content: fallback });
    log("llm.max_rounds_reached", { sessionID, maxRounds: llm.maxToolRounds });
    return fallback;
  };

  return {
    processOperatorMessage,
    getSessionCount: () => sessions.size
  };
};
