import { hub } from "./config.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryable = (status) => status === 429 || status === 500 || status === 502 || status === 503;

const getErrorMessage = async (response) => {
  const text = await response.text();
  if (!text) {
    return `HTTP ${response.status}`;
  }

  try {
    const parsed = JSON.parse(text);
    if (parsed?.error) return typeof parsed.error === "string" ? parsed.error : JSON.stringify(parsed.error);
    if (parsed?.message) return parsed.message;
    return JSON.stringify(parsed);
  } catch {
    return text;
  }
};

export const requestJson = async (url, { method = "GET", body, headers } = {}) => {
  let lastError;

  for (let attempt = 0; attempt < hub.retries; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), hub.timeoutMs);

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

      const message = await getErrorMessage(response);
      lastError = new Error(`${method} ${url} failed (${response.status}): ${message}`);

      if (!isRetryable(response.status) || attempt === hub.retries - 1) {
        throw lastError;
      }
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error.name === "AbortError"
        ? new Error(`${method} ${url} timed out after ${hub.timeoutMs}ms`)
        : error;

      if (attempt === hub.retries - 1) {
        throw lastError;
      }
    }

    const delay = hub.retryDelayMs * 2 ** attempt;
    await sleep(delay);
  }

  throw lastError;
};

export const getJson = (url, options) => requestJson(url, { ...options, method: "GET" });
export const postJson = (url, body, options) => requestJson(url, { ...options, method: "POST", body });
