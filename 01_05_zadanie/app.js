/**
 * Railway task agent runner.
 */

import { run } from "./src/agent.js";
import log from "./src/helpers/logger.js";
import { logStats, resetStats } from "./src/helpers/stats.js";

const TASK_QUERY = `Solve AG3NTS task "railway" end-to-end.

Requirements:
- Start with action help.
- Follow API documentation exactly.
- Handle temporary overload/rate-limit responses.
- Continue until you obtain a flag in format {FLG:...}.
- Keep tool calls minimal.`;

const main = async () => {
  log.box("AG3NTS Railway Agent\nNative-loop execution");
  resetStats();

  try {
    const result = await run(TASK_QUERY);
    log.success("Run complete");
    log.info(result.response);
    logStats();
  } catch (error) {
    log.error("Pipeline error", error.message);
    logStats();
    process.exit(1);
  }
};

main().catch((error) => {
  log.error("Startup error", error.message);
  process.exit(1);
});