/**
 * sendit one-shot pipeline runner.
 */

import { run } from "./src/agent.js";
import { hub, paths, task } from "./src/config.js";
import { enableFileLogging } from "./src/helpers/file-log.js";
import { logStats, resetStats } from "./src/helpers/stats.js";
import log from "./src/helpers/logger.js";

const TASK_QUERY = `Execute task "sendit" end-to-end with tools.

Hard workflow:
1) Call http_download_to_file for ${hub.docsBaseUrl}index.md -> ${paths.docsCacheDir}/index.md.
2) Read TOC first only:
   - read_file_lines on ${paths.docsCacheDir}/index.md lines 17-30
   - parse_markdown_toc on ${paths.docsCacheDir}/index.md
3) Do selective reading only (no full index dump):
   - read_markdown_section for needed sections
   - extract_include_files for include directives
4) Download required include files one by one to ${paths.docsCacheDir}/...
5) Analyze ${paths.docsCacheDir}/trasy-wylaczone.png with understand_image to confirm route code for Gdańsk -> Żarnowiec.
6) Determine category, WDP, and payment so budget 0 PP is valid.
7) Build declaration exactly in template format from zalacznik-E.md.
8) Submit via submit_verify with declaration.
9) In final response include:
   - final declaration text
   - verify status/result
   - saved artifact paths.

Known shipment data:
- Nadawca: ${task.payload.senderId}
- Punkt nadawczy: ${task.payload.dispatchPoint}
- Punkt docelowy: ${task.payload.destinationPoint}
- Waga: ${task.payload.weightKg} kg
- Budżet: ${task.payload.budgetPP} PP
- Zawartość: ${task.payload.contents}
- Uwagi specjalne: brak`;

const main = async () => {
  const fileLog = await enableFileLogging(paths.logsDir);
  let cleaned = false;

  const cleanup = async () => {
    if (cleaned) return;
    cleaned = true;
    logStats();
    await fileLog.close();
  };

  const shutdownHandler = async (code) => {
    try {
      await cleanup();
    } finally {
      process.exit(code);
    }
  };

  process.on("SIGINT", () => void shutdownHandler(130));
  process.on("SIGTERM", () => void shutdownHandler(143));

  log.box("SPK Sendit Agent (One-shot)");
  log.info(`File log: ${fileLog.relativePath}`);
  resetStats();

  try {
    const result = await run(TASK_QUERY);
    console.log(`\nAssistant:\n${result.response}\n`);
    await cleanup();
  } catch (error) {
    log.error("Pipeline error", error.message);
    await cleanup();
    process.exit(1);
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

