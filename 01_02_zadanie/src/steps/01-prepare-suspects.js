import { paths } from "../config.js";
import { readJsonFile, writeJsonFile } from "../io.js";

const normalizePerson = (person, index) => {
  const name = typeof person?.name === "string" ? person.name.trim() : "";
  const surname = typeof person?.surname === "string" ? person.surname.trim() : "";
  const birthYear = Number(person?.born);

  if (!name || !surname) {
	throw new Error(`Record ${index}: name and surname are required strings`);
  }

  if (!Number.isInteger(birthYear)) {
	throw new Error(`Record ${index}: born must be an integer birth year`);
  }

  return { name, surname, birthYear };
};

export const runPrepareSuspects = async () => {
  const raw = await readJsonFile(paths.inputSuspects, "input/transport.people.json");

  if (!Array.isArray(raw) || raw.length === 0) {
	throw new Error("Input suspects file must contain a non-empty JSON array");
  }

  const suspects = raw.map((person, index) => normalizePerson(person, index + 1));
  await writeJsonFile(paths.suspects, suspects);

  return {
	suspectsCount: suspects.length,
	outputPath: paths.suspects
  };
};

