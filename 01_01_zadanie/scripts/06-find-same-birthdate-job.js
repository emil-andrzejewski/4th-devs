import { paths } from "../src/config.js";
import { createGroups, loadPeopleAndSaveNormalized, writeJson } from "../src/people-grouping.js";

const run = async () => {
  console.log("[find-2] Loading people and saving normalized JSON");
  const people = await loadPeopleAndSaveNormalized();

  const groups = createGroups(
    people,
    (person) => `${person.birthDate}|${person.job}|${person.gender}`,
    "birthDate|job|gender"
  )

  await writeJson(paths.groupsBirthDateJob, groups);
  console.log(`[find-2] Saved ${groups.length} groups to ${paths.groupsBirthDateJob}`);
};

run().catch((error) => {
  console.error("[find-2] Error:", error.message);
  process.exit(1);
});

