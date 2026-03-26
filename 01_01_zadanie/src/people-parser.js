const toRecord = (parts, index) => {
  if (parts.length < 7) {
    throw new Error(`Invalid line format for record ${index}. Expected at least 7 fields, got ${parts.length}`);
  }

  const [name, surname, gender, birthDate, birthPlace, birthCountry, ...jobRest] = parts;
  const job = jobRest.join(";").trim();
  const born = Number.parseInt(String(birthDate).trim().split(".").at(-1), 10);

  if (!name || !surname || !gender || !birthDate || !birthPlace || !birthCountry || !job) {
    throw new Error(`Missing required fields for record ${index}`);
  }

  if (!Number.isInteger(born)) {
    throw new Error(`Invalid birthDate for record ${index}: ${birthDate}`);
  }

  return {
    id: index,
    name: name.trim(),
    surname: surname.trim(),
    gender: gender.trim(),
    birthDate: birthDate.trim(),
    birthPlace: birthPlace.trim(),
    birthCountry: birthCountry.trim(),
    born,
    city: birthPlace.trim(),
    job
  };
};

const parseTabSeparated = (raw) => raw
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line, index) => toRecord(line.split("\t"), index + 1));

const parseLegacySeparated = (raw) => raw
  .split(";|")
  .map((chunk) => chunk.trim().replace(/;$/, ""))
  .filter(Boolean)
  .map((chunk, index) => toRecord(chunk.split(";"), index + 1));

export const parsePeopleRaw = (raw) => {
  // New dataset uses one person per line and tabs between columns.
  if (raw.includes("\t")) {
    return parseTabSeparated(raw);
  }

  return parseLegacySeparated(raw);
};

