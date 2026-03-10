import { AI_API_KEY, EXTRA_API_HEADERS } from "../../config.js";
import { api } from "./config.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryable = (status) => status === 429 || status === 503 || status === 502 || status === 500;

const buildRequestBody = ({ model, input, textFormat }) => {
  const body = { model, input };

  if (textFormat) {
    body.text = { format: textFormat };
  }

  return body;
};

const fetchWithRetry = async (url, options) => {
  let lastError;

  for (let attempt = 0; attempt < api.retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), api.timeoutMs);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        return response;
      }

      const errorText = await response.text();
      lastError = new Error(`Responses API error (${response.status}): ${errorText}`);

      if (!isRetryable(response.status)) {
        throw lastError;
      }

      const delay = api.retryDelayMs * 2 ** attempt;
      console.warn(`Retry ${attempt + 1}/${api.retries} in ${delay}ms (status ${response.status})`);
      await sleep(delay);
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === "AbortError") {
        lastError = new Error(`Request timed out after ${api.timeoutMs}ms`);
      } else if (error.message.includes("Responses API error")) {
        throw error;
      } else {
        lastError = error;
      }

      if (attempt < api.retries - 1) {
        const delay = api.retryDelayMs * 2 ** attempt;
        console.warn(`Retry ${attempt + 1}/${api.retries} in ${delay}ms (${lastError.message})`);
        await sleep(delay);
      }
    }
  }

  throw lastError;
};

export const chat = async ({ model, input, textFormat }) => {
  const body = buildRequestBody({ model, input, textFormat });

  const response = await fetchWithRetry(api.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${AI_API_KEY}`,
      ...EXTRA_API_HEADERS
    },
    body: JSON.stringify(body)
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  return data;
};

export const extractText = (response) => {
  if (typeof response?.output_text === "string" && response.output_text.trim()) {
    return response.output_text;
  }

  const messages = response?.output?.filter((item) => item.type === "message") ?? [];

  const text = messages
    .flatMap((msg) => msg.content ?? [])
    .find((part) => part.type === "output_text")?.text;

  if (text) {
    return text;
  }

  const reasoningText = (response?.output ?? [])
    .filter((item) => item.type === "reasoning")
    .flatMap((item) => item.content ?? [])
    .find((part) => part.type === "reasoning_text")?.text;

  if (reasoningText && reasoningText.trim()) {
    return reasoningText;
  }

  throw new Error("No output text found in response");
};

export const extractJson = (response, label = "response") => {
  const text = extractText(response);

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Failed to parse JSON for ${label}: ${error.message}`);
  }
};