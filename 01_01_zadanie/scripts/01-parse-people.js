import { mkdir, readFile, writeFile } from "node:fs/promises";
import { paths } from "../src/config.js";

const parseYear = (birthDate, index) => {
  const parts = String(birthDate).trim().split(".");
  const yearText = parts.at(-1);
  const year = Number.parseInt(yearText, 10);

  if (!Number.isInteger(year)) {
    throw new Error(`Invalid birthDate for record ${index}: ${birthDate}`);
  }

  return year;
};

const toRecord = (rawChunk, index) => {
  const cleaned = rawChunk.trim().replace(/;$/, "");
  if (!cleaned) return null;

  const parts = cleaned.split(";");

  if (parts.length < 7) {
    throw new Error(`Invalid line format for record ${index}. Expected at least 7 fields, got ${parts.length}`);
  }

  const [name, surname, gender, birthDate, birthPlace, birthCountry, ...jobRest] = parts;
  const job = jobRest.join(";").trim();

  if (!name || !surname || !gender || !birthDate || !birthPlace || !birthCountry || !job) {
    throw new Error(`Missing required fields for record ${index}`);
  }

  return {
    name: name.trim(),
    surname: surname.trim(),
    gender: gender.trim(),
    birthDate: birthDate.trim(),
    birthPlace: birthPlace.trim(),
    birthCountry: birthCountry.trim(),
    born: parseYear(birthDate, index),
    city: birthPlace.trim(),
    job
  };
};

const run = async () => {
  console.log("[parse] Reading people.txt");
  const raw = await readFile(paths.peopleTxt, "utf8");

  const chunks = raw
    .split(";|")
    .map((line) => line.trim())
    .filter(Boolean);

  const records = chunks
    .map((chunk, index) => toRecord(chunk, index + 1))
    .filter(Boolean);

  await mkdir(paths.output, { recursive: true });
  await writeFile(paths.peopleWithJobs, JSON.stringify(records, null, 2), "utf8");

  console.log(`[parse] Saved ${records.length} records to ${paths.peopleWithJobs}`);
};

run().catch((error) => {
  console.error("[parse] Error:", error.message);
  process.exit(1);
});
