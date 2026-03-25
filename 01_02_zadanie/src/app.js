import { runPrepareSuspects } from "./steps/01-prepare-suspects.js";
import { runFindCandidate } from "./steps/02-find-candidate.js";
import { runSendAnswer } from "./steps/03-send-answer.js";

const main = async () => {
  console.log("[findhim] Step 1/3: prepare suspects...");
  const step1 = await runPrepareSuspects();
  console.log(`[findhim] Suspects ready: ${step1.suspectsCount}`);

  console.log("[findhim] Step 2/3: find nearest candidate...");
  const step2 = await runFindCandidate();
  console.log(
    `[findhim] Candidate: ${step2.candidate.name} ${step2.candidate.surname} `
    + `(distance ${step2.candidate.distanceKm} km, plant ${step2.candidate.powerPlant.code})`
  );

  console.log("[findhim] Step 3/3: fetch access level + send verify...");
  const step3 = await runSendAnswer();

  console.log("[findhim] Answer sent:", step3.answer);
  console.log("[findhim] Verify response:", step3.verifyResponse);
};

main().catch((error) => {
  console.error("[findhim] Pipeline error:", error.message);
  process.exit(1);
});

