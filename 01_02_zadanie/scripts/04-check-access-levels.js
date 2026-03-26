import { runCheckAccessLevels } from "../src/steps/04-check-access-levels.js";

runCheckAccessLevels()
  .then((result) => {
    console.log("[step4] Done:", result);
  })
  .catch((error) => {
    console.error("[step4] Error:", error.message);
    process.exit(1);
  });
