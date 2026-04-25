/**
 * Native tools for AG3NTS railway task.
 */

import { railway } from "../config.js";
import log from "../helpers/logger.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const parseJsonSafely = (text) => {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, value: text };
  }
};

const lowerCaseHeaders = (headers) => {
  const out = {};
  for (const [key, value] of Object.entries(headers)) {
    out[String(key).toLowerCase()] = value;
  }
  return out;
};

const parseWaitFromDateOrSeconds = (value, nowMs) => {
  if (!value) return 0;

  const text = String(value).trim();
  if (!text) return 0;

  const numeric = Number(text);
  if (!Number.isNaN(numeric)) {
    if (numeric > 1e12) {
      return Math.max(0, Math.round(numeric - nowMs));
    }
    if (numeric > 1e9) {
      return Math.max(0, Math.round(numeric * 1000 - nowMs));
    }
    return Math.max(0, Math.round(numeric * 1000));
  }

  const parsedDateMs = Date.parse(text);
  if (!Number.isNaN(parsedDateMs)) {
    return Math.max(0, parsedDateMs - nowMs);
  }

  return 0;
};

const getRateLimitWaitMs = (responseHeaders) => {
  const nowMs = Date.now();
  const headers = lowerCaseHeaders(responseHeaders);

  const retryAfterMs = parseWaitFromDateOrSeconds(headers["retry-after"], nowMs);

  const remainingRaw =
    headers["x-ratelimit-remaining"]
    ?? headers["ratelimit-remaining"]
    ?? headers["x-rate-limit-remaining"];

  const remaining = Number(remainingRaw);

  const resetRaw =
    headers["x-ratelimit-reset"]
    ?? headers["ratelimit-reset"]
    ?? headers["x-rate-limit-reset"];

  const resetWaitMs = parseWaitFromDateOrSeconds(resetRaw, nowMs);

  if (!Number.isNaN(remaining) && remaining <= 0) {
    return Math.max(retryAfterMs, resetWaitMs);
  }

  return retryAfterMs;
};

const hasFlag = (payload) => /\{FLG:[^}]+\}/.test(JSON.stringify(payload));

const computeBackoffMs = (attempt) => {
  const backoff = railway.backoffInitialMs * (railway.backoffMultiplier ** (attempt - 1));
  return Math.min(backoff, railway.backoffMaxMs);
};

const requestVerify = async (payload) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), railway.timeoutMs);

  try {
    return await fetch(railway.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

export const nativeTools = [
  {
    type: "function",
    name: "railway_request",
    description: "Send one action request to AG3NTS railway API through verify endpoint. Input should contain answer object, for example {\"action\":\"help\"}.",
    parameters: {
      type: "object",
      properties: {
        answer: {
          type: "object",
          description: "Body for railway action, e.g. {\"action\":\"help\"}",
          additionalProperties: true
        }
      },
      required: ["answer"],
      additionalProperties: false
    },
    strict: false
  }
];

export const nativeHandlers = {
  async railway_request({ answer }) {
    if (!isPlainObject(answer)) {
      throw new Error("answer must be an object");
    }

    const payload = {
      apikey: railway.apiKey,
      task: railway.task,
      answer
    };

    let waitedMsTotal = 0;
    let lastError;

    for (let attempt = 1; attempt <= railway.maxAttempts; attempt += 1) {
      log.verifyRequest({
        endpoint: railway.endpoint,
        method: "POST",
        attempt,
        body: payload
      });

      try {
        const response = await requestVerify(payload);
        const rawText = await response.text();
        const parsed = parseJsonSafely(rawText);
        const body = parsed.ok ? parsed.value : { raw_text: rawText };
        const headers = Object.fromEntries(response.headers.entries());
        const rateLimitWaitMs = getRateLimitWaitMs(headers);

        log.verifyResponse({
          attempt,
          status: response.status,
          headers,
          body,
          rate_limit_wait_ms: rateLimitWaitMs,
          waited_ms_total: waitedMsTotal
        });

        const retryableStatus = response.status === 503 || response.status === 429;
        if (retryableStatus && attempt < railway.maxAttempts) {
          const backoffMs = computeBackoffMs(attempt);
          const waitMs = Math.max(backoffMs, rateLimitWaitMs);

          if (waitMs > 0) {
            waitedMsTotal += waitMs;
            log.wait(`verify retry before attempt ${attempt + 1}`, waitMs);
            await sleep(waitMs);
          }

          continue;
        }

        if (rateLimitWaitMs > 0 && !hasFlag(body)) {
          waitedMsTotal += rateLimitWaitMs;
          log.wait("verify rate-limit cooldown", rateLimitWaitMs);
          await sleep(rateLimitWaitMs);
        }

        return {
          ok: response.ok,
          status: response.status,
          headers,
          body,
          attempt,
          waited_ms: waitedMsTotal
        };
      } catch (error) {
        lastError = error;
        const isAbort = error?.name === "AbortError";

        if (attempt >= railway.maxAttempts) {
          break;
        }

        const backoffMs = computeBackoffMs(attempt);
        waitedMsTotal += backoffMs;

        log.warn(
          `verify network error on attempt ${attempt}: ${isAbort ? `timeout after ${railway.timeoutMs}ms` : error.message}`
        );
        log.wait(`verify retry before attempt ${attempt + 1}`, backoffMs);
        await sleep(backoffMs);
      }
    }

    throw new Error(lastError?.message || `Failed after ${railway.maxAttempts} attempts`);
  }
};

/**
 * Check if a tool is native.
 */
export const isNativeTool = (name) => name in nativeHandlers;

/**
 * Execute a native tool.
 */
export const executeNativeTool = async (name, args) => {
  const handler = nativeHandlers[name];
  if (!handler) throw new Error(`Unknown native tool: ${name}`);
  return handler(args);
};