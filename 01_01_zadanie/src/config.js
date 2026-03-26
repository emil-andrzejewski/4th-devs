import path from "node:path";
import { fileURLToPath } from "node:url";
import { RESPONSES_API_ENDPOINT, resolveModelForProvider } from "../../config.js";

const DIRNAME = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = path.resolve(DIRNAME, "..");

export const paths = {
  project: PROJECT_DIR,
  peopleTxt: path.join(PROJECT_DIR, "people.txt"),
  peopleAllTxt: path.join(PROJECT_DIR, "people_all.txt"),
  peopleInput: path.join(PROJECT_DIR, "people_all.txt"),
  output: path.join(PROJECT_DIR, "output"),
  peopleWithJobs: path.join(PROJECT_DIR, "output", "people-with-jobs.json"),
  peopleWithTags: path.join(PROJECT_DIR, "output", "people-with-tags.json"),
  transportPeople: path.join(PROJECT_DIR, "output", "transport.people.json"),
  peopleNormalized: path.join(PROJECT_DIR, "output", "people.normalized.json"),
  groupsBirthDatePlace: path.join(PROJECT_DIR, "output", "groups.birthdate-place.json"),
  groupsBirthDateJob: path.join(PROJECT_DIR, "output", "groups.birthdate-job.json"),
  groupsBirthPlaceJob: path.join(PROJECT_DIR, "output", "groups.birthplace-job.json"),
  groupsBirthDatePlaceJob: path.join(PROJECT_DIR, "output", "groups.birthdate-place-job.json"),
};

export const models = {
  tag: resolveModelForProvider("z-ai/glm-4.7")
};

export const api = {
  endpoint: RESPONSES_API_ENDPOINT,
  timeoutMs: 180_000,
  retries: 3,
  retryDelayMs: 1000
};

export const verify = {
  endpoint: "https://hub.ag3nts.org/verify",
  task: "people",
  apiKey: process.env.AG3NTS_API_KEY?.trim() || "2a23564e-df92-4d92-8d27-a198b2d60c9f"
};

const args = process.argv.slice(2);

export const cli = {
  batchSize: (() => {
    const batchArg = args.find((arg) => arg.startsWith("--batch="));
    if (!batchArg) return 8;
    const value = parseInt(batchArg.split("=")[1], 10);
    return Number.isNaN(value) || value < 1 ? 8 : Math.min(value, 25);
  })()
};
