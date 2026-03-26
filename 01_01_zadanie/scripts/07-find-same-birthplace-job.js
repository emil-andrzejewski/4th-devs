import { paths } from "../src/config.js";
import { createGroups, loadPeopleAndSaveNormalized, writeJson } from "../src/people-grouping.js";

const run = async () => {
  console.log("[find-3] Loading people and saving normalized JSON");
  const people = await loadPeopleAndSaveNormalized();

  const groups = createGroups(
    people,
    (person) => `${person.birthPlace}|${person.job}|${person.gender}`,
    "birthPlace|job|gender"

  await writeJson(paths.groupsBirthPlaceJob, groups);
  console.log(`[find-3] Saved ${groups.length} groups to ${paths.groupsBirthPlaceJob}`);
};

run().catch((error) => {
  console.error("[find-3] Error:", error.message);
  process.exit(1);
});

