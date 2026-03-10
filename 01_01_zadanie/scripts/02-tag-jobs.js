import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chat, extractJson, extractText } from "../src/api.js";
import { cli, models, paths } from "../src/config.js";
import { ALLOWED_TAGS, tagBatchResponseSchema, validateOutputRecord } from "../src/schemas/tags.js";

const chunkArray = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

const buildPrompt = (items) => {
  const tagList = ALLOWED_TAGS.map((tag) => `- ${tag}`).join("\n");

  return [
    "Jestes klasyfikatorem zawodow.",
    "Dla kazdego opisu pracy przypisz 1..N tagow tylko z dozwolonej listy.",
    "Nie wymyslaj nowych tagow i nie zwracaj nic poza JSON zgodnym ze schema.",
    "",
    "Dozwolone tagi:",
    tagList,
    "",
    "Elementy do klasyfikacji:",
    JSON.stringify({ items }, null, 2)
  ].join("\n");
};

const validateBatchResult = (result, expectedIndexes) => {
  if (!result || !Array.isArray(result.items)) {
    throw new Error("Model response does not contain items array");
  }

  const seen = new Set();

  for (const item of result.items) {
    if (!Number.isInteger(item.index)) {
      throw new Error("Model response item has invalid index");
    }

    if (!Array.isArray(item.tags) || item.tags.length === 0) {
      throw new Error(`Model response item ${item.index} has empty tags`);
    }

    for (const tag of item.tags) {
      if (!ALLOWED_TAGS.includes(tag)) {
        throw new Error(`Model response item ${item.index} has invalid tag: ${tag}`);
      }
    }

    seen.add(item.index);
  }

  for (const idx of expectedIndexes) {
    if (!seen.has(idx)) {
      throw new Error(`Model response missing item index: ${idx}`);
    }
  }
};

const tryParseJsonFromText = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (!objectMatch) {
      return null;
    }

    try {
      return JSON.parse(objectMatch[0]);
    } catch {
      return null;
    }
  }
};

const classifyBatch = async (batch, batchNumber, totalBatches) => {
  const expectedIndexes = batch.map((item) => item.index);
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      console.log(`[tag] Batch ${batchNumber}/${totalBatches}, attempt ${attempt}`);
      const response = await chat({
        model: models.tag,
        input: [
          {
            role: "user",
            content: [{ type: "input_text", text: buildPrompt(batch) }]
          }
        ],
        textFormat: tagBatchResponseSchema
      });

      let parsed;

      try {
        parsed = extractJson(response, `tag batch ${batchNumber}`);
      } catch {
        const text = extractText(response);
        parsed = tryParseJsonFromText(text);
      }

      if (!parsed) {
        throw new Error("Response did not contain valid JSON");
      }

      validateBatchResult(parsed, expectedIndexes);
      return parsed;
    } catch (error) {
      lastError = error;
      console.warn(`[tag] Batch ${batchNumber} failed on attempt ${attempt}: ${error.message}`);
    }
  }

  throw lastError;
};

const run = async () => {
  console.log("[tag] Reading people-with-jobs.json");
  const raw = await readFile(paths.peopleWithJobs, "utf8");
  const people = JSON.parse(raw);

  if (!Array.isArray(people) || people.length === 0) {
    throw new Error("Input file must contain a non-empty array");
  }

  const peopleForTagging = people.map((person, index) => ({
    index,
    name: person.name,
    surname: person.surname,
    job: person.job
  }));

  const allTags = new Map();
  const batches = chunkArray(peopleForTagging, cli.batchSize);

  for (let i = 0; i < batches.length; i += 1) {
    const batch = batches[i];
    const parsed = await classifyBatch(batch, i + 1, batches.length);

    for (const item of parsed.items) {
      allTags.set(item.index, [...new Set(item.tags)]);
    }
  }

  const output = people.map((person, index) => {
    const record = {
      name: person.name,
      surname: person.surname,
      gender: person.gender,
      born: person.born,
      city: person.city,
      tags: allTags.get(index) ?? []
    };

    validateOutputRecord(record, index + 1);
    return record;
  });

  await mkdir(paths.output, { recursive: true });
  await writeFile(paths.peopleWithTags, JSON.stringify(output, null, 2), "utf8");
  console.log(`[tag] Saved ${output.length} records to ${paths.peopleWithTags}`);
};

run().catch((error) => {
  console.error("[tag] Error:", error.message);
  process.exit(1);
});