import { llm, responses } from "./config.js";
import { requestJson } from "./api.js";

const extractTextFromMessageContent = (content) => {
  if (!Array.isArray(content)) return null;

  for (const part of content) {
    if (!part || typeof part !== "object") continue;

    if (part.type === "output_text" && typeof part.text === "string" && part.text.trim()) {
      return part.text.trim();
    }

    if (part.type === "text" && typeof part.text === "string" && part.text.trim()) {
      return part.text.trim();
    }
  }

  return null;
};

export const extractToolCalls = (response) =>
  (response.output ?? []).filter((item) => item?.type === "function_call");

export const extractResponseText = (response) => {
  if (typeof response?.output_text === "string" && response.output_text.trim()) {
    return response.output_text.trim();
  }

  const messageItem = (response.output ?? []).find((item) => item?.type === "message");
  return extractTextFromMessageContent(messageItem?.content);
};

const getUsageOutputTokens = (response) => {
  const outputTokens = response?.usage?.output_tokens;
  return Number.isInteger(outputTokens) ? outputTokens : null;
};

const getOutputPreview = (response, maxChars = 180) => {
  const text = extractResponseText(response);
  if (!text) return "";
  return text.length > maxChars ? `${text.slice(0, maxChars)}...` : text;
};

export const getResponseCompletionInfo = (response) => {
  const status = typeof response?.status === "string" ? response.status : null;
  const incompleteReason = response?.incomplete_details?.reason ?? null;
  const usageOutputTokens = getUsageOutputTokens(response);

  const maxOutputTokensReached = (
    incompleteReason === "max_output_tokens"
    || (status === "incomplete" && incompleteReason === "max_output_tokens")
  );

  return {
    status,
    incompleteReason,
    usageOutputTokens,
    maxOutputTokensReached,
    outputPreview: getOutputPreview(response)
  };
};

export const createResponse = async ({ input, tools }) => {
  const body = responses.buildResponsesRequest({
    model: llm.model,
    input,
    tools,
    instructions: llm.instructions,
    max_output_tokens: llm.maxOutputTokens,
    tool_choice: "auto"
  });

  return requestJson(responses.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${responses.apiKey}`,
      ...responses.extraHeaders
    },
    body
  });
};
