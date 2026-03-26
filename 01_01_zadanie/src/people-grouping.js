import { mkdir, readFile, writeFile } from "node:fs/promises";
import { paths } from "./config.js";
import { parsePeopleRaw } from "./people-parser.js";

export const loadPeopleFromTxt = async () => {
  const raw = await readFile(paths.peopleInput, "utf8");
  return parsePeopleRaw(raw);
};

export const writeJson = async (filePath, data) => {
  await mkdir(paths.output, { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
};

export const loadPeopleAndSaveNormalized = async () => {
  const people = await loadPeopleFromTxt();
  await writeJson(paths.peopleNormalized, people);
  return people;
};

const toPersonView = (person) => ({
  id: person.id,
  name: person.name,
  surname: person.surname,
  birthDate: person.birthDate,
  birthPlace: person.birthPlace,
  job: person.job
});

export const createGroups = (people, keyBuilder, keyLabel) => {
  const map = new Map();

  for (const person of people) {
    const key = keyBuilder(person);
    const bucket = map.get(key) ?? [];
    bucket.push(toPersonView(person));
    map.set(key, bucket);
  }

  return [...map.entries()]
    .filter(([, members]) => members.length > 1)
    .map(([key, members]) => ({ keyLabel, key, size: members.length, members }))
    .sort((a, b) => b.size - a.size || a.key.localeCompare(b.key));
};

