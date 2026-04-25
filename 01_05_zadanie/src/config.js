import { resolveModelForProvider } from "../../config.js";

const AG3NTS_API_KEY = process.env.AG3NTS_API_KEY?.trim() ?? "";

if (!AG3NTS_API_KEY) {
  console.error("\x1b[31mError: AG3NTS_API_KEY is not configured\x1b[0m");
  console.error("       Add AG3NTS_API_KEY to the repo root .env file.");
  process.exit(1);
}

export const api = {
  model: resolveModelForProvider("gpt-5.2"),
  maxOutputTokens: 16384,
  instructions: `You are an autonomous API operator solving the AG3NTS task "railway".

GOAL
- Activate railway route X-01 and obtain a final flag in the format {FLG:...}.

RULES
- Use ONLY the tool railway_request for all communication with AG3NTS.
- First call MUST be: {"action":"help"}.
- Never guess action names or parameters.
- Follow API docs returned by help and all error messages exactly.
- Stop only after you get a flag in response body.

EXECUTION
- Be concise.
- Do not ask the user for permission.
- Iterate until completion with minimal extra calls.`
};

export const railway = {
  endpoint: "https://hub.ag3nts.org/verify",
  task: "railway",
  apiKey: AG3NTS_API_KEY,
  timeoutMs: 30000,
  maxAttempts: 8,
  backoffInitialMs: 1000,
  backoffMultiplier: 2,
  backoffMaxMs: 60000
};