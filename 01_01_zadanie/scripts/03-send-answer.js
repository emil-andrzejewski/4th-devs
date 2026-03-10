import { readFile } from "node:fs/promises";
import { paths, verify } from "../src/config.js";
import { validateOutputRecord } from "../src/schemas/tags.js";

const run = async () => {
  console.log("[send] Reading people-with-tags.json");
  const raw = await readFile(paths.peopleWithTags, "utf8");
  const answer = JSON.parse(raw);

  if (!Array.isArray(answer) || answer.length === 0) {
    throw new Error("people-with-tags.json must contain a non-empty array");
  }

  answer.forEach((record, index) => validateOutputRecord(record, index + 1));

  const payload = {
    apikey: verify.apiKey,
    task: verify.task,
    answer
  };

  console.log(`[send] Sending ${answer.length} records to ${verify.endpoint}`);
  const response = await fetch(verify.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  let parsedBody = text;

  try {
    parsedBody = JSON.parse(text);
  } catch {
    // Keep plain text body when JSON parsing is not possible.
  }

  console.log("[send] HTTP status:", response.status);
  console.log("[send] Response:", parsedBody);
};

run().catch((error) => {
  console.error("[send] Error:", error.message);
  process.exit(1);
});