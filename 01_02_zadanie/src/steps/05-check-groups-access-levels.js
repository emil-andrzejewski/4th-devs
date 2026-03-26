import path from "node:path";
import { paths } from "../config.js";
import { readJsonFile, writeJsonFile } from "../io.js";
import { fetchAccessLevel } from "../hubApi.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRateLimitError = (error) => {
  const message = String(error?.message ?? "");
  return message.includes("(429)") || message.toLowerCase().includes("za czesto");
};

const fetchAccessLevelWithRetry = async (person) => {
  const attempts = 6;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetchAccessLevel(person);
    } catch (error) {
      if (!isRateLimitError(error) || attempt === attempts) {
        throw error;
      }

      // Delikatne zwalnianie tempa po 429, aby nie tracić całego przebiegu.
      const delayMs = 1200 * attempt;
      await sleep(delayMs);
    }
  }

  throw new Error("Unexpected retry flow in fetchAccessLevelWithRetry");
};

const parseBirthYear = (record, indexLabel) => {
  const fromNumber = Number(record?.birthYear ?? record?.born);
  if (Number.isInteger(fromNumber)) {
    return fromNumber;
  }

  const birthDate = typeof record?.birthDate === "string" ? record.birthDate.trim() : "";
  const match = birthDate.match(/(\d{4})$/);

  if (match) {
    return Number(match[1]);
  }

  throw new Error(`${indexLabel}: cannot determine birthYear from birthYear/born/birthDate`);
};

const normalizeMember = (member, indexLabel, source, groupKey) => {
  const name = typeof member?.name === "string" ? member.name.trim() : "";
  const surname = typeof member?.surname === "string" ? member.surname.trim() : "";
  const id = Number.isInteger(Number(member?.id)) ? Number(member.id) : null;
  const birthYear = parseBirthYear(member, indexLabel);

  if (!name || !surname) {
    throw new Error(`${indexLabel}: name and surname are required strings`);
  }

  return {
    id,
    name,
    surname,
    birthYear,
    source,
    groupKey
  };
};

const personKey = (person) => {
  if (person.id !== null) {
    return `id:${person.id}`;
  }

  return `person:${person.name.toLowerCase()}|${person.surname.toLowerCase()}|${person.birthYear}`;
};

const collectMembers = async (filePath) => {
  const source = path.basename(filePath);
  const groups = await readJsonFile(filePath, filePath);

  if (!Array.isArray(groups) || groups.length === 0) {
    throw new Error(`${source}: expected a non-empty JSON array`);
  }

  const records = [];

  groups.forEach((group, groupIndex) => {
    if (!Array.isArray(group?.members) || group.members.length === 0) {
      throw new Error(`${source} group ${groupIndex + 1}: members must be a non-empty array`);
    }

    const groupKey = typeof group.key === "string" && group.key.trim()
      ? group.key.trim()
      : `group-${groupIndex + 1}`;

    group.members.forEach((member, memberIndex) => {
      const label = `${source} group ${groupIndex + 1} member ${memberIndex + 1}`;
      records.push(normalizeMember(member, label, source, groupKey));
    });
  });

  return { source, groups, records };
};

export const runCheckGroupsAccessLevels = async () => {
  const placeData = await collectMembers(paths.inputGroupsBirthdatePlace);
  const jobData = await collectMembers(paths.inputGroupsBirthdateJob);

  const allRecords = [...placeData.records, ...jobData.records];
  const unique = new Map();

  for (const record of allRecords) {
    const key = personKey(record);
    const existing = unique.get(key);

    if (!existing) {
      unique.set(key, {
        id: record.id,
        name: record.name,
        surname: record.surname,
        birthYear: record.birthYear,
        sources: [record.source],
        groupKeys: [record.groupKey]
      });
      continue;
    }

    if (!existing.sources.includes(record.source)) {
      existing.sources.push(record.source);
    }

    if (!existing.groupKeys.includes(record.groupKey)) {
      existing.groupKeys.push(record.groupKey);
    }
  }

  const checkedPeople = [];
  const accessByKey = new Map();

  for (const [key, person] of unique.entries()) {
    try {
      const { accessLevel, raw } = await fetchAccessLevelWithRetry(person);
      const result = {
        ...person,
        status: "ok",
        accessLevel,
        raw
      };
      checkedPeople.push(result);
      accessByKey.set(key, result);
    } catch (error) {
      const result = {
        ...person,
        status: "error",
        error: error.message
      };
      checkedPeople.push(result);
      accessByKey.set(key, result);
    }

    // Krótka przerwa między kolejnymi osobami zmniejsza ryzyko 429.
    await sleep(150);
  }

  const sourceGroups = [...placeData.groups.map((group) => ({ ...group, source: placeData.source })), ...jobData.groups.map((group) => ({ ...group, source: jobData.source }))];

  const groups = sourceGroups.map((group, groupIndex) => {
    const members = group.members.map((member, memberIndex) => {
      const normalized = normalizeMember(
        member,
        `${group.source} group ${groupIndex + 1} member ${memberIndex + 1}`,
        group.source,
        group.key
      );

      const checked = accessByKey.get(personKey(normalized));

      return {
        id: normalized.id,
        name: normalized.name,
        surname: normalized.surname,
        birthYear: normalized.birthYear,
        status: checked?.status ?? "error",
        ...(checked?.status === "ok"
          ? { accessLevel: checked.accessLevel }
          : { error: checked?.error ?? "Missing person result" })
      };
    });

    const successCount = members.filter((item) => item.status === "ok").length;

    return {
      source: group.source,
      keyLabel: group.keyLabel,
      key: group.key,
      size: members.length,
      successCount,
      failedCount: members.length - successCount,
      members
    };
  });

  const successCount = checkedPeople.filter((item) => item.status === "ok").length;
  const failedCount = checkedPeople.length - successCount;

  const report = {
    generatedAt: new Date().toISOString(),
    inputs: [placeData.source, jobData.source],
    summary: {
      sourceRecords: allRecords.length,
      uniquePeople: checkedPeople.length,
      groupsCount: groups.length,
      successCount,
      failedCount
    },
    people: checkedPeople,
    groups
  };

  await writeJsonFile(paths.accessLevelsGroups, report);

  return {
    ...report.summary,
    outputPath: paths.accessLevelsGroups
  };
};
