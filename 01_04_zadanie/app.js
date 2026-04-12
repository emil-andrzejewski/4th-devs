/**
 * sendit one-shot pipeline runner.
 */

import { run } from "./src/agent.js";
import { paths, task } from "./src/config.js";
import { enableFileLogging } from "./src/helpers/file-log.js";
import { logStats, resetStats } from "./src/helpers/stats.js";
import log from "./src/helpers/logger.js";

const TASK_QUERY = `Solve task "sendit" end-to-end using available tools.

Goal:
- Prepare correct transport declaration and get successful verification in Hub.

General rules:
- Work autonomously.
- Minimize context usage by downloading docs to disk and reading only necessary fragments.
- Discover required sources and constraints from documentation yourself.
- For image files in docs, use vision tools.
- Preserve exact declaration formatting required by documentation.
- Use provided shipment data and budget constraint.
- Submit final declaration via submit_verify and report result with saved artifact paths.

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
