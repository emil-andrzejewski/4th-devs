/**
 * Agent loop: chat -> tool calls -> results cycle until completion.
 * Native tools only.
 */

import { chat, extractToolCalls, extractText } from "./api.js";
import { nativeTools, executeNativeTool } from "./native/tools.js";
import log from "./helpers/logger.js";

const MAX_STEPS = 80;

const parseArguments = (toolCall) => {
  try {
    return JSON.parse(toolCall.arguments ?? "{}");
  } catch {
    throw new Error(`Invalid JSON arguments for tool ${toolCall.name}`);
  }
};

const runTool = async (toolCall) => {
  const args = parseArguments(toolCall);
  log.tool(toolCall.name, args);

  try {
    const result = await executeNativeTool(toolCall.name, args);
    const output = JSON.stringify(result);
    log.toolResult(toolCall.name, true, output);
    return { type: "function_call_output", call_id: toolCall.call_id, output };
  } catch (error) {
    const output = JSON.stringify({ error: error.message });
    log.toolResult(toolCall.name, false, output);
    return { type: "function_call_output", call_id: toolCall.call_id, output };
  }
};

const runToolsSequentially = async (toolCalls) => {
  const results = [];
  for (const toolCall of toolCalls) {
    results.push(await runTool(toolCall));
  }
  return results;
};

export const run = async (query, { conversationHistory = [] } = {}) => {
  const messages = [...conversationHistory, { role: "user", content: query }];

  log.query(query);

  for (let step = 1; step <= MAX_STEPS; step += 1) {
    log.api(`Step ${step}`, messages.length);
    const response = await chat({ input: messages, tools: nativeTools });
    log.apiDone(response.usage);

    const toolCalls = extractToolCalls(response);
    messages.push(...(response.output ?? []));

    if (toolCalls.length === 0) {
      const text = extractText(response) ?? "No response";
      log.response(text);
      return { response: text, conversationHistory: messages };
    }

    const results = await runToolsSequentially(toolCalls);
    messages.push(...results);
  }

  throw new Error(`Max steps (${MAX_STEPS}) reached`);
};