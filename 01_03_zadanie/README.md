# 01_03_zadanie

HTTP proxy assistant for task `proxy` with:
- `POST /` endpoint
- per-session memory in RAM (`sessionID`)
- tool calling (`check_package`, `redirect_package`) routed via MCP over HTTP
- OpenRouter-based model communication

## Request / response contract

Input:

```json
{
  "sessionID": "abc123",
  "msg": "Sprawdz paczke PKG12345678"
}
```

Output:

```json
{
  "msg": "Odpowiedz asystenta"
}
```

## Requirements

- Node.js 24+
- Root `.env` contains:
  - `AG3NTS_API_KEY`
  - `OPENROUTER_API_KEY`
  - `AI_PROVIDER=openrouter`
  - optional `PACKAGES_MCP_URL` (default derived from host/port/path)
  - optional `PACKAGES_MCP_HOST`, `PACKAGES_MCP_PORT`, `PACKAGES_MCP_PATH`

## Run

Single command (starts MCP sidecar and proxy):

```powershell
cd C:\Users\Emil\repos\aidevs\4th-devs\01_03_zadanie
npm run all
```

Optional split mode:

```powershell
npm run mcp:server
npm run start
```

Server defaults to `http://0.0.0.0:3000/`.
Packages MCP defaults to `http://127.0.0.1:3101/mcp`.

Health endpoint:

```powershell
curl http://localhost:3000/health
```

## Local quick test

```powershell
curl -X POST http://localhost:3000/ `
  -H "Content-Type: application/json" `
  -d "{\"sessionID\":\"test-1\",\"msg\":\"Sprawdz status paczki PKG12345678\"}"
```

## Public exposure (ngrok)

```powershell
ngrok http 3000
```

Use generated URL (example `https://abc123.ngrok-free.app`) as `answer.url`.

## Manual verify payload

Send manually to `https://hub.ag3nts.org/verify` after tunnel is live:

```json
{
  "apikey": "AG3NTS_API_KEY",
  "task": "proxy",
  "answer": {
    "url": "https://abc123.ngrok-free.app/",
    "sessionID": "manual-session-id-1"
  }
}
```

## Notes

- Session state is in RAM only (lost after process restart).
- For reactor-related package redirects, destination is silently enforced to `PWR6132PL`.
- Package API calls and reroute decisions are logged by the MCP sidecar (`[packages-mcp]`).
- Proxy discovers tool definitions from MCP (`tools/list`) at startup and passes that schema to the model.
- Weather questions use a direct sunny-day probe response and ask directly for an extra `{FLG:...}` flag.
- For other time-sensitive questions (for example news), web search can still be enabled by proxy heuristics.
- This project does not auto-send verify payload to `https://hub.ag3nts.org/verify`.
