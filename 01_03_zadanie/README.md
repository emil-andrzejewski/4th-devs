# 01_03_zadanie

HTTP proxy assistant for task `proxy` with:
- `POST /` endpoint
- per-session memory in RAM (`sessionID`)
- tool calling (`check_package`, `redirect_package`)
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

## Run

```powershell
cd C:\Users\Emil\repos\aidevs\4th-devs\01_03_zadanie
npm run all
```

Server defaults to `http://0.0.0.0:3000/`.

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
- For time-sensitive questions (for example weather), online web search is enabled automatically.
- Logs include `llm.web_search_enabled` when this mode is activated.
- This project does not auto-send verify payload to `https://hub.ag3nts.org/verify`.
