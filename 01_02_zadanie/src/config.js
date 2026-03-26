import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const DIRNAME = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = path.resolve(DIRNAME, "..");
const ROOT_DIR = path.resolve(PROJECT_DIR, "..");
const ROOT_ENV_FILE = path.join(ROOT_DIR, ".env");

if (existsSync(ROOT_ENV_FILE) && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(ROOT_ENV_FILE);
}

export const paths = {
  project: PROJECT_DIR,
  inputSuspects: path.join(PROJECT_DIR, "input", "transport.people.json"),
  inputGroupsBirthdatePlace: path.join(PROJECT_DIR, "input", "groups.birthdate-place.json"),
  inputGroupsBirthdateJob: path.join(PROJECT_DIR, "input", "groups.birthdate-job.json"),
  output: path.join(PROJECT_DIR, "output"),
  suspects: path.join(PROJECT_DIR, "output", "suspects.json"),
  accessLevels: path.join(PROJECT_DIR, "output", "access-levels.json"),
  accessLevelsGroups: path.join(PROJECT_DIR, "output", "access-levels-groups.json"),
  powerPlants: path.join(PROJECT_DIR, "output", "power-plants.json"),
  locationsScan: path.join(PROJECT_DIR, "output", "locations-scan.json"),
  candidateLocation: path.join(PROJECT_DIR, "output", "candidate-location.json"),
  finalPayload: path.join(PROJECT_DIR, "output", "verify-payload.json"),
  verifyResponse: path.join(PROJECT_DIR, "output", "verify-response.json")
};

export const hub = {
  baseUrl: "https://hub.ag3nts.org",
  timeoutMs: 30_000,
  retries: 3,
  retryDelayMs: 700
};

export const verify = {
  endpoint: `${hub.baseUrl}/verify`,
  task: "findhim",
  apiKey: process.env.AG3NTS_API_KEY?.trim() || ""
};

export const cli = {
  force: process.argv.includes("--force")
};
