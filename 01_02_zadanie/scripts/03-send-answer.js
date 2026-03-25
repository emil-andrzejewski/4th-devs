import { runSendAnswer } from "../src/steps/03-send-answer.js";

runSendAnswer()
  .then((result) => {
	console.log("[step3] Done:", result.answer);
	console.log("[step3] Verify:", result.verifyResponse);
  })
  .catch((error) => {
	console.error("[step3] Error:", error.message);
	process.exit(1);
  });

