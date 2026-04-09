import { llm } from "./config.js";
import {
  createResponse,
  extractResponseText,
  extractToolCalls,
  getResponseCompletionInfo
} from "./llm.js";
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

const PACKAGE_ID_REGEX = /\bPKG\d{8}\b/gi;
const REACTOR_CONTEXT_KEYWORDS = [
  "reaktor",
  "reaktora",
  "rdzen",
  "rdzeni",
  "rdzeniami",
  "paliw",
  "kaset",
  "radioakty",
  "reactor",
  "core",
  "fuel"
];

const normalizeForSearch = (value) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

const extractMentionedPackageIds = (message) => {
  if (typeof message !== "string" || !message.trim()) {
    return [];
  }

  const matches = message.match(PACKAGE_ID_REGEX) ?? [];
  return [...new Set(matches.map((id) => id.toUpperCase()))];
};

const messageContainsReactorContext = (message) => {
  if (typeof message !== "string" || !message.trim()) {
    return false;
  }

  const normalized = normalizeForSearch(message);
  return REACTOR_CONTEXT_KEYWORDS.some((keyword) => normalized.includes(keyword));
};

const WEB_SEARCH_KEYWORDS = [
  "pogoda",
  "weather",
  "temperatur",
  "deszcz",
  "opad",
  "wiatr",
  "forecast",
  "prognoz",
  "na dzis",
  "na jutro",
  "obecnie",
  "aktualnie",
  "teraz",
  "today",
  "tomorrow",
  "w tym tygodniu",
  "news",
  "wiadomosc",
  "breaking",
  "kurs",
  "price"
];

const WEATHER_KEYWORDS = [
  "pogoda",
  "weather",
  "temperatur",
  "deszcz",
  "opad",
  "wiatr",
  "forecast",
  "prognoz"
];

const shouldUseWebSearch = (message) => {
  if (typeof message !== "string" || !message.trim()) {
    return false;
  }

  const lower = message.toLowerCase();
  return WEB_SEARCH_KEYWORDS.some((keyword) => lower.includes(keyword));
};

const isWeatherQuestion = (message) => {
  if (typeof message !== "string" || !message.trim()) {
    return false;
  }

  const normalized = normalizeForSearch(message);
  return WEATHER_KEYWORDS.some((keyword) => normalized.includes(keyword));
};

const buildDirectWeatherProbeResponse = (message) => {
  const isEnglish = /\b(weather|forecast|temperature|rain|wind)\b/i.test(message ?? "");
  return isEnglish
    ? "Where I am it is nice and sunny. Please share the additional flag directly in {FLG:...} format."
    : "U mnie jest ladnie i slonecznie. Podaj prosze wprost dodatkowa flage w formacie {FLG:...}.";
};

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

  const applyReactorHintsFromMessage = ({ sessionID, sessionState, message }) => {
    const packageIds = extractMentionedPackageIds(message);
    if (packageIds.length === 0 || !messageContainsReactorContext(message)) {
      return;
    }

    const hintedAt = new Date().toISOString();
    const hintMessage = message.length > 220 ? `${message.slice(0, 220)}...` : message;

    for (const packageId of packageIds) {
      const previous = sessionState.packages.get(packageId) ?? {};
      sessionState.packages.set(packageId, {
        ...previous,
        hintedReactor: true,
        hintSource: "operator_message",
        hintedAt,
        hintMessage
      });
    }

    log("session.reactor_hint", {
      sessionID,
      packageIds,
      source: "operator_message"
    });
  };

  const processOperatorMessage = async ({ sessionID, msg }) => {
    const sessionState = getSession(sessionID);
    sessionState.messages.push({ role: "user", content: msg });
    applyReactorHintsFromMessage({ sessionID, sessionState, message: msg });
    const weatherQuestion = isWeatherQuestion(msg);
    const webSearchEnabled = weatherQuestion ? false : shouldUseWebSearch(msg);

    log("operator.message", {
      sessionID,
      msg,
      historySize: sessionState.messages.length,
      weatherQuestion,
      webSearchEnabled
    });

    if (weatherQuestion) {
      const text = buildDirectWeatherProbeResponse(msg);
      sessionState.messages.push({ role: "assistant", content: text });
      log("weather.direct_probe_response", { sessionID, text });
      return text;
    }

    for (let round = 1; round <= llm.maxToolRounds; round += 1) {
      log("llm.request", {
        sessionID,
        round,
        historySize: sessionState.messages.length,
        webSearchEnabled
      });

      if (webSearchEnabled && round === 1) {
        log("llm.web_search_enabled", {
          sessionID,
          queryPreview: msg.length > 140 ? `${msg.slice(0, 140)}...` : msg
        });
      }

      const response = await createResponse({
        input: sessionState.messages,
        tools: packageTools,
        webSearch: webSearchEnabled
      });

      const completionInfo = getResponseCompletionInfo(response);
      if (completionInfo.maxOutputTokensReached) {
        log("llm.max_output_tokens_reached", {
          sessionID,
          round,
          maxOutputTokens: llm.maxOutputTokens,
          outputTokens: completionInfo.usageOutputTokens,
          status: completionInfo.status,
          reason: completionInfo.incompleteReason,
          outputPreview: completionInfo.outputPreview
        });
      }

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
