import { hub } from "./config.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryable = (status) =>
  status === 429 || status === 500 || status === 502 || status === 503;

const readErrorMessage = async (response) => {
  const text = await response.text();

  if (!text) {
    return `HTTP ${response.status}`;
  }

  try {
    const parsed = JSON.parse(text);
    if (parsed?.error) {
      return typeof parsed.error === "string"
        ? parsed.error
        : JSON.stringify(parsed.error);
    }

    if (parsed?.message) {
      return parsed.message;
    }

    return JSON.stringify(parsed);
  } catch {
    return text;
  }
};

export const requestJson = async (
  url,
  {
    method = "GET",
    body,
    headers,
    timeoutMs = hub.timeoutMs,
    retries = hub.retries,
    retryDelayMs = hub.retryDelayMs
  } = {}
) => {
  let lastError;

  for (let attempt = 0; attempt < retries; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...headers
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return response.json();
      }

      const message = await readErrorMessage(response);
      lastError = new Error(`${method} ${url} failed (${response.status}): ${message}`);

      if (!isRetryable(response.status) || attempt === retries - 1) {
        throw lastError;
      }
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error.name === "AbortError"
        ? new Error(`${method} ${url} timed out after ${timeoutMs}ms`)
        : error;

      if (attempt === retries - 1) {
        throw lastError;
      }
    }

    const delay = retryDelayMs * 2 ** attempt;
    await sleep(delay);
  }

  throw lastError;
};

export const postJson = (url, body, options) =>
  requestJson(url, { ...options, method: "POST", body });
