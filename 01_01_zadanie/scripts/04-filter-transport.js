import { mkdir, readFile, writeFile } from "node:fs/promises";
import { paths } from "../src/config.js";

const run = async () => {
  console.log("[parse] Reading people-with-tags.json");
  const raw = await readFile(paths.peopleWithTags, "utf8");

  const transportPeople = JSON.parse(raw).filter(person => person.tags?.includes("transport"));

  await mkdir(paths.output, { recursive: true });
  await writeFile(paths.transportPeople, JSON.stringify(transportPeople, null, 2), "utf8");

  console.log(`[parse] Saved ${transportPeople.length} records to ${paths.transportPeople}`);
};

run().catch((error) => {
  console.error("[parse] Error:", error.message);
  process.exit(1);
});
