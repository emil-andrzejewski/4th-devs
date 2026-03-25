import { getJson, postJson } from "./api.js";
import { hub, verify } from "./config.js";

const collectObjects = (input, out = []) => {
  if (!input || typeof input !== "object") return out;

  if (Array.isArray(input)) {
	for (const item of input) {
	  collectObjects(item, out);
	}
	return out;
  }

  out.push(input);

  for (const value of Object.values(input)) {
	collectObjects(value, out);
  }

  return out;
};

const pickNumber = (object, keys) => {
  for (const key of keys) {
	if (object[key] !== undefined && object[key] !== null) {
	  const numeric = Number(object[key]);
	  if (!Number.isNaN(numeric)) {
		return numeric;
	  }
	}
  }

  return null;
};

const extractCoordinates = (payload) => {
  const objects = collectObjects(payload);
  const coordinates = [];

  for (const item of objects) {
	const latitude = pickNumber(item, ["latitude", "lat", "y"]);
	const longitude = pickNumber(item, ["longitude", "lon", "lng", "long", "x"]);

	if (latitude === null || longitude === null) {
	  continue;
	}

	coordinates.push({ latitude, longitude });
  }

  const unique = [];
  const seen = new Set();

  for (const coordinate of coordinates) {
	const key = `${coordinate.latitude}|${coordinate.longitude}`;
	if (seen.has(key)) {
	  continue;
	}

	seen.add(key);
	unique.push(coordinate);
  }

  return unique;
};

const normalizeCityName = (value) => {
  if (typeof value !== "string") {
	return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
};

const normalizeText = (value) => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .trim();

const KNOWN_CITY_COORDINATES = {
  zabrze: { latitude: 50.3249, longitude: 18.7857 },
  "piotrkow trybunalski": { latitude: 51.4055, longitude: 19.7030 },
  grudziadz: { latitude: 53.4841, longitude: 18.7537 },
  tczew: { latitude: 54.0924, longitude: 18.7779 },
  radom: { latitude: 51.4027, longitude: 21.1471 },
  chelmno: { latitude: 53.3486, longitude: 18.4258 },
  zarnowiec: { latitude: 54.7273, longitude: 18.0941 }
};

const extractLocationNames = (payload) => {
  const objects = collectObjects(payload);
  const names = [];

  if (Array.isArray(payload)) {
	for (const item of payload) {
	  if (typeof item === "string") {
		const city = normalizeCityName(item);
		if (city) {
		  names.push(city);
		}
	  }
	}
  }

  for (const item of objects) {
	for (const key of ["city", "location", "name", "town", "place"]) {
	  const city = normalizeCityName(item[key]);
	  if (city) {
		names.push(city);
	  }
	}
  }

  const unique = [];
  const seen = new Set();

  for (const city of names) {
	const key = city.toLowerCase();
	if (seen.has(key)) {
	  continue;
	}

	seen.add(key);
	unique.push(city);
  }

  return unique;
};

const extractPowerPlantCode = (item) => {
  const candidates = [item.code, item.powerPlant, item.power_plant, item.id, item.plantCode];

  for (const candidate of candidates) {
	if (typeof candidate === "string" && candidate.trim()) {
	  return candidate.trim();
	}
  }

  return null;
};

const extractPowerPlants = (payload) => {
  const objects = collectObjects(payload);
  const powerPlants = [];

  const byCity = payload?.power_plants;
  if (byCity && typeof byCity === "object" && !Array.isArray(byCity)) {
	for (const [city, meta] of Object.entries(byCity)) {
	  const code = extractPowerPlantCode(meta ?? {});
	  if (!code) {
		continue;
	  }

	  const latitude = pickNumber(meta ?? {}, ["latitude", "lat", "y"]);
	  const longitude = pickNumber(meta ?? {}, ["longitude", "lon", "lng", "long", "x"]);

	  powerPlants.push({
		city: normalizeCityName(city),
		code,
		...(latitude === null || longitude === null ? {} : { latitude, longitude })
	  });
	}
  }

  for (const item of objects) {
	const code = extractPowerPlantCode(item);
	const latitude = pickNumber(item, ["latitude", "lat", "y"]);
	const longitude = pickNumber(item, ["longitude", "lon", "lng", "long", "x"]);

	if (!code) {
	  continue;
	}

	const city = normalizeCityName(item.city ?? item.name ?? item.town ?? item.location);

	powerPlants.push({
	  code,
	  ...(city ? { city } : {}),
	  ...(latitude === null || longitude === null ? {} : { latitude, longitude })
	});
  }

  const uniqueByCode = [];
  const seenCodes = new Set();

  for (const powerPlant of powerPlants) {
	if (seenCodes.has(powerPlant.code)) {
	  continue;
	}

	seenCodes.add(powerPlant.code);
	uniqueByCode.push(powerPlant);
  }

  return uniqueByCode.map((powerPlant) => {
	if (powerPlant.latitude !== undefined && powerPlant.longitude !== undefined) {
	  return powerPlant;
	}

	const cityKey = normalizeText(powerPlant.city);
	const coordinates = KNOWN_CITY_COORDINATES[cityKey];

	if (!coordinates) {
	  return powerPlant;
	}

	return {
	  ...powerPlant,
	  latitude: coordinates.latitude,
	  longitude: coordinates.longitude,
	  coordinatesSource: "city-fallback"
	};
  });
};

const extractAccessLevel = (payload) => {
  if (typeof payload?.accessLevel === "number") {
	return payload.accessLevel;
  }

  for (const item of collectObjects(payload)) {
	for (const [key, value] of Object.entries(item)) {
	  if (!/access/i.test(key)) {
		continue;
	  }

	  const numeric = Number(value);
	  if (!Number.isNaN(numeric)) {
		return numeric;
	  }
	}
  }

  throw new Error("Could not extract accessLevel from /api/accesslevel response");
};

const ensureApiKey = () => {
  if (!verify.apiKey) {
	throw new Error("Missing AG3NTS_API_KEY. Set it in environment before running pipeline.");
  }
};

export const fetchPowerPlants = async () => {
  ensureApiKey();

  const url = `${hub.baseUrl}/data/${verify.apiKey}/findhim_locations.json`;
  const raw = await getJson(url);
  const plants = extractPowerPlants(raw);

  if (plants.length === 0) {
	throw new Error("No power plants found in findhim_locations.json response");
  }

  return { url, raw, plants };
};

export const fetchPersonLocations = async ({ name, surname }) => {
  ensureApiKey();

  const raw = await postJson(`${hub.baseUrl}/api/location`, {
	apikey: verify.apiKey,
	name,
	surname
  });

  return {
	raw,
	locations: extractCoordinates(raw),
	locationNames: extractLocationNames(raw)
  };
};

export const fetchAccessLevel = async ({ name, surname, birthYear }) => {
  ensureApiKey();

  const raw = await postJson(`${hub.baseUrl}/api/accesslevel`, {
	apikey: verify.apiKey,
	name,
	surname,
	birthYear
  });

  return {
	raw,
	accessLevel: extractAccessLevel(raw)
  };
};

export const sendVerify = async (answer) => {
  ensureApiKey();

  return postJson(verify.endpoint, {
	apikey: verify.apiKey,
	task: verify.task,
	answer
  });
};

