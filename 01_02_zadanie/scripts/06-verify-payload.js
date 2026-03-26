import { paths } from "../src/config.js";
import { readJsonFile, writeJsonFile } from "../src/io.js";
import { sendVerify } from "../src/hubApi.js";

const validateAnswer = (answer) => {
  if (!answer || typeof answer !== "object") {
    throw new Error("Invalid payload: missing object at 'answer'");
  }

  const requiredStringFields = ["name", "surname", "powerPlant"];

  for (const field of requiredStringFields) {
    if (typeof answer[field] !== "string" || !answer[field].trim()) {
      throw new Error(`Invalid payload: answer.${field} must be a non-empty string`);
    }
  }

  const level = Number(answer.accessLevel);
  if (!Number.isFinite(level)) {
    throw new Error("Invalid payload: answer.accessLevel must be a number");
  }

  return {
    name: answer.name.trim(),
    surname: answer.surname.trim(),
    accessLevel: level,
    powerPlant: answer.powerPlant.trim()
  };
};

const run = async () => {
  const payload = await readJsonFile(paths.finalPayload, "output/verify-payload.json");
  const answer = validateAnswer(payload.answer);

  console.log("[verify-payload] Sending answer to /verify...");
  const verifyResponse = await sendVerify(answer);

  await writeJsonFile(paths.verifyResponse, verifyResponse);

  console.log("[verify-payload] Done");
  console.log("[verify-payload] Answer:", answer);
  console.log("[verify-payload] Verify response:", verifyResponse);
};

run().catch((error) => {
  console.error("[verify-payload] Error:", error.message);
  process.exit(1);
});

