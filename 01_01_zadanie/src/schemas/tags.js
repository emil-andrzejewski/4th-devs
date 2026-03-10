export const ALLOWED_TAGS = [
  "IT",
  "transport",
  "edukacja",
  "medycyna",
  "praca z ludźmi",
  "praca z pojazdami",
  "praca fizyczna"
];

export const tagBatchResponseSchema = {
  type: "json_schema",
  name: "job_tags_batch",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["items"],
    properties: {
      items: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["index", "tags"],
          properties: {
            index: {
              type: "integer",
              minimum: 0
            },
            tags: {
              type: "array",
              minItems: 1,
              uniqueItems: true,
              items: {
                type: "string",
                enum: ALLOWED_TAGS
              }
            }
          }
        }
      }
    }
  }
};

export const validateOutputRecord = (record, index) => {
  const requiredStringFields = ["name", "surname", "gender", "city"];

  for (const field of requiredStringFields) {
    if (typeof record[field] !== "string" || !record[field].trim()) {
      throw new Error(`Record ${index}: invalid ${field}`);
    }
  }

  if (!Number.isInteger(record.born)) {
    throw new Error(`Record ${index}: born must be an integer year`);
  }

  if (!Array.isArray(record.tags) || record.tags.length === 0) {
    throw new Error(`Record ${index}: tags must be a non-empty array`);
  }

  for (const tag of record.tags) {
    if (!ALLOWED_TAGS.includes(tag)) {
      throw new Error(`Record ${index}: unsupported tag \"${tag}\"`);
    }
  }
};