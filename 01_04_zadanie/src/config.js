import { resolveModelForProvider } from "../../config.js";

const AG3NTS_API_KEY = process.env.AG3NTS_API_KEY?.trim() ?? "";

if (!AG3NTS_API_KEY) {
  console.error("\x1b[31mError: AG3NTS_API_KEY is not configured\x1b[0m");
  console.error("       Add AG3NTS_API_KEY to the repo root .env file.");
  process.exit(1);
}

export const hub = {
  docsBaseUrl: "https://hub.ag3nts.org/dane/doc/",
  verifyEndpoint: "https://hub.ag3nts.org/verify"
};

export const task = {
  apiKey: AG3NTS_API_KEY,
  name: "sendit",
  payload: {
    senderId: "450202122",
    dispatchPoint: "Gdańsk",
    destinationPoint: "Żarnowiec",
    weightKg: 2800,
    budgetPP: 0,
    contents: "kasety z paliwem do reaktora",
    specialNotes: ""
  }
};

export const paths = {
  docsCacheDir: "workspace/docs-cache",
  outputDir: "workspace/output",
  logsDir: "workspace/logs",
  declaration: "workspace/output/declaration.txt",
  verifyPayload: "workspace/output/verify-payload.json",
  verifyResponse: "workspace/output/verify-response.json"
};

export const api = {
  model: resolveModelForProvider("gpt-5.2"),
  visionModel: resolveModelForProvider("gpt-5.2"),
  maxOutputTokens: 16384,
  instructions: `You are an autonomous transport declaration agent for SPK task "sendit".

PRIMARY OBJECTIVE
- Build a valid declaration and submit it to /verify using submit_verify.

MANDATORY CONTEXT-CONTROL WORKFLOW
1. First download index.md to local disk with http_download_to_file.
2. Do NOT load the entire index.md into model context.
3. Read table of contents first via read_file_lines on lines 17-30.
4. Use parse_markdown_toc to map sections.
5. Read only needed sections with read_markdown_section or read_file_lines.
6. Resolve and download include files one by one with http_download_to_file.
7. For image include files, use understand_image.

DELIVERY
- Call submit_verify exactly once after composing final declaration.
- Final response must include everything what is needed for declaration approval
`
};
