import { runCheckGroupsAccessLevels } from "../src/steps/05-check-groups-access-levels.js";

runCheckGroupsAccessLevels()
  .then((result) => {
    console.log("[step5] Done:", result);
  })
  .catch((error) => {
    console.error("[step5] Error:", error.message);
    process.exit(1);
  });
