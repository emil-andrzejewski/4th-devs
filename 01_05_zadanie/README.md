# 01_05_zadanie (railway)

Autonomous native-tool agent for AG3NTS task `railway`.

The agent:
- starts with `{"action":"help"}`,
- follows the API documentation returned by the task endpoint,
- retries on `503` with exponential backoff,
- respects rate-limit headers before next calls,
- stops when it gets `{FLG:...}`.

## Run

```bash
cd C:\Users\Emil\repos\aidevs\4th-devs\01_05_zadanie
npm start
```

## Required env (repo root `.env`)

- `AG3NTS_API_KEY`
- one of: `OPENAI_API_KEY` or `OPENROUTER_API_KEY`

## Logging

Console logs include full JSON traces (with secret redaction):
- `LLM REQUEST`
- `LLM RESPONSE`
- `VERIFY REQUEST`
- `VERIFY RESPONSE`

Redacted fields include keys such as `apikey`, `authorization`, and `token`.