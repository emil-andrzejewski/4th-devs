/**
 * Structured terminal logger with secret redaction.
 */

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bgBlue: "\x1b[44m",
  bgMagenta: "\x1b[45m",
  bgGreen: "\x1b[42m"
};

const REDACTED = "***REDACTED***";
const SECRET_KEY_TOKENS = ["apikey", "api_key", "authorization", "secret", "password"];

const timestamp = () => new Date().toLocaleTimeString("en-US", { hour12: false });

const looksSecretKey = (key) => {
  const normalized = String(key ?? "").toLowerCase();
  if (!normalized) return false;

  if (SECRET_KEY_TOKENS.some((token) => normalized.includes(token))) {
    return true;
  }

  return (
    normalized === "token"
    || normalized === "access_token"
    || normalized === "refresh_token"
    || normalized === "id_token"
    || normalized.endsWith("_token")
  );
};

const maskString = (value) => {
  const text = String(value ?? "");
  if (!text) return REDACTED;
  if (text.length <= 8) return REDACTED;
  return `${text.slice(0, 4)}...${text.slice(-4)}`;
};

const redactStringByKeyHint = (value, keyHint) => {
  if (looksSecretKey(keyHint)) {
    if (String(keyHint).toLowerCase().includes("authorization") && String(value).startsWith("Bearer ")) {
      return `Bearer ${maskString(String(value).slice(7))}`;
    }
    return maskString(value);
  }
  return value;
};

const redactSecrets = (value, keyHint = "", seen = new WeakSet()) => {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "string") {
    return redactStringByKeyHint(value, keyHint);
  }

  if (typeof value !== "object") {
    return value;
  }

  if (seen.has(value)) {
    return "[Circular]";
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => redactSecrets(item, keyHint, seen));
  }

  const out = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    if (looksSecretKey(key)) {
      if (typeof nestedValue === "string") {
        out[key] = redactStringByKeyHint(nestedValue, key);
      } else {
        out[key] = REDACTED;
      }
      continue;
    }

    out[key] = redactSecrets(nestedValue, key, seen);
  }

  return out;
};

const toJson = (value) => {
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const section = (tag, color, payload) => {
  const safePayload = redactSecrets(payload);
  console.log(`\n${color}${colors.white} ${tag} ${colors.reset}`);
  console.log(toJson(safePayload));
};

const log = {
  info: (msg) => console.log(`${colors.dim}[${timestamp()}]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.dim}[${timestamp()}]${colors.reset} ${colors.green}[OK]${colors.reset} ${msg}`),
  error: (title, msg) => console.log(`${colors.dim}[${timestamp()}]${colors.reset} ${colors.red}[ERR] ${title}${colors.reset} ${msg || ""}`),
  warn: (msg) => console.log(`${colors.dim}[${timestamp()}]${colors.reset} ${colors.yellow}[WARN]${colors.reset} ${msg}`),
  start: (msg) => console.log(`${colors.dim}[${timestamp()}]${colors.reset} ${colors.cyan}->${colors.reset} ${msg}`),

  box: (text) => {
    const lines = text.split("\n");
    const width = Math.max(...lines.map((line) => line.length)) + 4;
    console.log(`\n${colors.cyan}${"-".repeat(width)}${colors.reset}`);
    for (const line of lines) {
      console.log(`${colors.cyan}|${colors.reset} ${colors.bright}${line.padEnd(width - 3)}${colors.reset}${colors.cyan}|${colors.reset}`);
    }
    console.log(`${colors.cyan}${"-".repeat(width)}${colors.reset}\n`);
  },

  query: (q) => console.log(`\n${colors.bgBlue}${colors.white} QUERY ${colors.reset} ${q}\n`),
  response: (r) => console.log(`\n${colors.green}Response:${colors.reset} ${r}\n`),

  api: (step, msgCount) => console.log(`${colors.dim}[${timestamp()}]${colors.reset} ${colors.magenta}*${colors.reset} ${step} (${msgCount} messages)`),
  apiDone: (usage) => {
    if (usage) {
      console.log(`${colors.dim}         tokens: ${usage.input_tokens} in / ${usage.output_tokens} out${colors.reset}`);
    }
  },

  tool: (name, args) => {
    const renderedArgs = toJson(redactSecrets(args));
    console.log(`${colors.dim}[${timestamp()}]${colors.reset} ${colors.yellow}tool${colors.reset} ${name}`);
    console.log(renderedArgs);
  },

  toolResult: (name, success, output) => {
    const state = success ? `${colors.green}ok${colors.reset}` : `${colors.red}error${colors.reset}`;
    console.log(`${colors.dim}         ${state} ${name}${colors.reset}`);
    console.log(toJson(redactSecrets(output)));
  },

  wait: (label, waitedMs) => {
    console.log(`${colors.dim}[${timestamp()}]${colors.reset} ${colors.yellow}wait${colors.reset} ${label}: ${waitedMs}ms`);
  },

  llmRequest: (payload) => section("LLM REQUEST", colors.bgBlue, payload),
  llmResponse: (payload) => section("LLM RESPONSE", colors.bgGreen, payload),
  verifyRequest: (payload) => section("VERIFY REQUEST", colors.bgMagenta, payload),
  verifyResponse: (payload) => section("VERIFY RESPONSE", colors.bgMagenta, payload)
};

export default log;
