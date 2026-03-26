import { paths } from "../src/config.js";
import { createGroups, loadPeopleAndSaveNormalized, writeJson } from "../src/people-grouping.js";

const run = async () => {
  console.log("[find-1] Loading people and saving normalized JSON");
  const people = await loadPeopleAndSaveNormalized();

  const groups = createGroups(
    people,
    (person) => `${person.birthDate}|${person.birthPlace}|${person.gender}`,
    "birthDate|birthPlace|gender"
  );

  await writeJson(paths.groupsBirthDatePlace, groups);
  console.log(`[find-1] Saved ${groups.length} groups to ${paths.groupsBirthDatePlace}`);
};

run().catch((error) => {
  console.error("[find-1] Error:", error.message);
  process.exit(1);
});

