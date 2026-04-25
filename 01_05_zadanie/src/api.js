import { api } from "./config.js";
import {
  AI_API_KEY,
  EXTRA_API_HEADERS,
  RESPONSES_API_ENDPOINT
} from "../../config.js";
import { extractResponseText } from "./helpers/response.js";
import { recordUsage } from "./helpers/stats.js";
import log from "./helpers/logger.js";

const parseJsonSafely = (text) => {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, value: text };
  }
};

/**
 * Calls the Responses API and logs full request/response payloads.
 */
export const chat = async ({
  model = api.model,
  input,
  tools,
  toolChoice = "auto",
  instructions = api.instructions,
  maxOutputTokens = api.maxOutputTokens
}) => {
  const body = { model, input };

  if (tools?.length) body.tools = tools;
  if (tools?.length) body.tool_choice = toolChoice;
  if (instructions) body.instructions = instructions;
  if (maxOutputTokens) body.max_output_tokens = maxOutputTokens;

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${AI_API_KEY}`,
    ...EXTRA_API_HEADERS
  };

  log.llmRequest({
    endpoint: RESPONSES_API_ENDPOINT,
    method: "POST",
    headers,
    body
  });

  const response = await fetch(RESPONSES_API_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  const rawText = await response.text();
  const parsed = parseJsonSafely(rawText);
  const responseHeaders = Object.fromEntries(response.headers.entries());

  log.llmResponse({
    status: response.status,
    headers: responseHeaders,
    body: parsed.ok ? parsed.value : { raw_text: rawText }
  });

  if (!parsed.ok) {
    throw new Error(`Responses API returned non-JSON body (${response.status})`);
  }

  const data = parsed.value;

  if (!response.ok || data.error) {
    throw new Error(data?.error?.message || `Responses API request failed (${response.status})`);
  }

  recordUsage(data.usage);

  return data;
};

/**
 * Extracts function calls from response.
 */
export const extractToolCalls = (response) =>
  (response.output ?? []).filter((item) => item.type === "function_call");

/**
 * Extracts text content from response.
 */
export const extractText = (response) => {
  return extractResponseText(response) || null;
};