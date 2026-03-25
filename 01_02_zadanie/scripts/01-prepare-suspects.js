import { runPrepareSuspects } from "../src/steps/01-prepare-suspects.js";

runPrepareSuspects()
  .then((result) => {
	console.log("[step1] Done:", result);
  })
  .catch((error) => {
	console.error("[step1] Error:", error.message);
	process.exit(1);
  });

