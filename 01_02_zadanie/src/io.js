import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";

export const readJsonFile = async (filePath, label = filePath) => {
  const raw = await readFile(filePath, "utf8");

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON in ${label}: ${error.message}`);
  }
};

export const writeJsonFile = async (filePath, data) => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
};
