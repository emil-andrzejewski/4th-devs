import { paths } from "../src/config.js";
import { createGroups, loadPeopleAndSaveNormalized, writeJson } from "../src/people-grouping.js";

const run = async () => {
  console.log("[find-4] Loading people and saving normalized JSON");
  const people = await loadPeopleAndSaveNormalized();

  const groups = createGroups(
    people,
    (person) => `${person.birthDate}|${person.birthPlace}|${person.job}`,
    "birthDate|birthPlace|job"
  );

  await writeJson(paths.groupsBirthDatePlaceJob, groups);
  console.log(`[find-4] Saved ${groups.length} groups to ${paths.groupsBirthDatePlaceJob}`);
};

run().catch((error) => {
  console.error("[find-4] Error:", error.message);
  process.exit(1);
});

