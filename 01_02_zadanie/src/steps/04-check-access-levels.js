import { paths } from "../config.js";
import { readJsonFile, writeJsonFile } from "../io.js";
import { fetchAccessLevel } from "../hubApi.js";

const normalizePerson = (person, index) => {
  const name = typeof person?.name === "string" ? person.name.trim() : "";
  const surname = typeof person?.surname === "string" ? person.surname.trim() : "";
  const birthYear = Number(person?.born ?? person?.birthYear);

  if (!name || !surname) {
    throw new Error(`Record ${index}: name and surname are required strings`);
  }

  if (!Number.isInteger(birthYear)) {
    throw new Error(`Record ${index}: born/birthYear must be an integer birth year`);
  }

  return { name, surname, birthYear };
};

export const runCheckAccessLevels = async () => {
  const raw = await readJsonFile(paths.inputSuspects, "input/transport.people.json");

  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("Input suspects file must contain a non-empty JSON array");
  }

  const people = raw.map((person, index) => normalizePerson(person, index + 1));
  const checks = [];

  for (const person of people) {
    try {
      const { accessLevel, raw: accessRaw } = await fetchAccessLevel(person);
      checks.push({
        ...person,
        status: "ok",
        accessLevel,
        raw: accessRaw
      });
    } catch (error) {
      checks.push({
        ...person,
        status: "error",
        error: error.message
      });
    }
  }

  const successCount = checks.filter((item) => item.status === "ok").length;
  const failedCount = checks.length - successCount;

  const result = {
    checked: checks.length,
    successCount,
    failedCount,
    checks
  };

  await writeJsonFile(paths.accessLevels, result);

  return {
    checked: checks.length,
    successCount,
    failedCount,
    outputPath: paths.accessLevels
  };
};
