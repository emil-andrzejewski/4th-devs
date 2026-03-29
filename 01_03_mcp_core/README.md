# 01_03_mcp_core

Core MCP capabilities over stdio: tools, resources, prompts, elicitation, and sampling.

## Run

```bash
npm run lesson3:mcp_core
```

## Debug server.js (spawned by client)

`client.js` can start the server with Node inspector enabled, so you can attach a debugger to the spawned `src/server.js` process.

```bash
# break on first line in server process (default port 9230)
npm run start:debug-server

# do not break on first line (wait for your breakpoint)
npm run start:debug-server:inspect
```

You can also use env vars directly:

```bash
# 1/true/yes/on enables debugger
MCP_SERVER_INSPECT=1

# optional: "brk" (default) or "inspect"
MCP_SERVER_INSPECT_MODE=brk

# optional: custom port (default 9230)
MCP_SERVER_INSPECT_PORT=9230
```

Then attach your IDE debugger to `127.0.0.1:9230` (or your custom port).

## What it does

1. Spawns a local MCP server as a subprocess over stdio
2. Lists the available tools, resources, and prompts
3. Calls `calculate` directly through MCP
4. Runs `summarize_with_confirmation` to demonstrate elicitation and sampling

## MCP capabilities

| Type | Name | Description |
|------|------|-------------|
| Tool | `calculate` | Basic arithmetic (add, subtract, multiply, divide) |
| Tool | `summarize_with_confirmation` | Summarizes text after elicitation (user confirmation) and sampling (LLM completion) |
| Resource | `config://project` | Static project configuration |
| Resource | `data://stats` | Dynamic runtime statistics |
| Prompt | `code-review` | Code review template with args (code, language, focus) |

## Notes

The client handles sampling with the shared workspace AI config, so setup lives in the root `README.md` and `.env`.
