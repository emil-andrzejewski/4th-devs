import { runFindCandidate } from "../src/steps/02-find-candidate.js";

runFindCandidate()
  .then((result) => {
	console.log("[step2] Done:", result);
  })
  .catch((error) => {
	console.error("[step2] Error:", error.message);
	process.exit(1);
  });

