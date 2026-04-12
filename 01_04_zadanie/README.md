# 01_04_zadanie (sendit)

One-shot agent pipeline that:
- downloads SPK docs to local cache,
- reads only selected fragments (TOC + needed sections),
- builds declaration in strict template format,
- auto-sends payload to `https://hub.ag3nts.org/verify`,
- saves declaration/payload/response artifacts.

## Run

```bash
cd C:\Users\Emil\repos\aidevs\4th-devs\01_04_zadanie
npm start
```

## Required env (repo root `.env`)

- `AG3NTS_API_KEY`
- `OPENAI_API_KEY` or `OPENROUTER_API_KEY`

## Output files

- `workspace/output/declaration.txt`
- `workspace/output/verify-payload.json`
- `workspace/output/verify-response.json`
- run logs: `workspace/logs/run-*.txt`

## Notes

- Pipeline is non-interactive (no REPL).
- It uses `download-to-disk + selective read` flow to avoid loading full `index.md` into model context.

