/**
 * One-shot agent loop: chat -> tool calls -> tool outputs until completion.
 * Uses native tools only.
 */

import {
  chat,
  extractReasoning,
  extractStepTexts,
  extractToolCalls,
  extractText
} from "./api.js";
import { nativeTools, executeNativeTool } from "./native/tools.js";
import log from "./helpers/logger.js";

const MAX_STEPS = 60;

const parseToolArguments = (toolCall) => {
  try {
    return JSON.parse(toolCall.arguments ?? "{}");
  } catch {
    throw new Error(`Invalid JSON arguments for tool ${toolCall.name}`);
  }
};

const runTool = async (toolCall) => {
  const args = parseToolArguments(toolCall);
  log.info(`Tool call: ${toolCall.name}`);

  try {
    const result = await executeNativeTool(toolCall.name, args);
    return {
      type: "function_call_output",
      call_id: toolCall.call_id,
      output: JSON.stringify(result)
    };
  } catch (error) {
    return {
      type: "function_call_output",
      call_id: toolCall.call_id,
      output: JSON.stringify({ error: error.message })
    };
  }
};

const runTools = (toolCalls) => Promise.all(toolCalls.map(runTool));

const logStepTrace = (response) => {
  const reasoning = extractReasoning(response);
  const stepTexts = extractStepTexts(response);

  if (reasoning.summary.length > 0) {
    for (const summaryLine of reasoning.summary) {
      log.info(`[reasoning] ${summaryLine}`);
    }
  } else if (reasoning.reasoningCount > 0) {
    if (reasoning.encryptedCount > 0) {
      log.info("[reasoning] Provider returned encrypted reasoning without summary.");
    } else {
      log.info("[reasoning] Reasoning item received, but summary was empty.");
    }
  }

  if (stepTexts.length > 0) {
    for (const text of stepTexts) {
      log.info(`[assistant] ${text}`);
    }
  }
};

export const run = async (query, { conversationHistory = [] } = {}) => {
  const messages = [...conversationHistory, { role: "user", content: query }];

  log.query(query);

  for (let step = 1; step <= MAX_STEPS; step += 1) {
    log.api(`Step ${step}`, messages.length);
    const response = await chat({
      input: messages,
      tools: nativeTools
    });
    log.apiDone(response.usage);
    logStepTrace(response);

    const toolCalls = extractToolCalls(response);
    messages.push(...(response.output ?? []));

    if (toolCalls.length === 0) {
      const text = extractText(response) ?? "No response";
      return {
        response: text,
        conversationHistory: messages
      };
    }

    const toolOutputs = await runTools(toolCalls);
    messages.push(...toolOutputs);
  }

  throw new Error(`Max steps (${MAX_STEPS}) reached`);
};
