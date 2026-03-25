const EARTH_RADIUS_KM = 6371;

const toRadians = (degrees) => (degrees * Math.PI) / 180;
const hasCoordinates = (point) => point && point.latitude !== undefined && point.longitude !== undefined;
const normalizeText = (value) => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .trim();

export const haversineKm = (pointA, pointB) => {
  const latitudeA = Number(pointA.latitude);
  const longitudeA = Number(pointA.longitude);
  const latitudeB = Number(pointB.latitude);
  const longitudeB = Number(pointB.longitude);

  const values = [latitudeA, longitudeA, latitudeB, longitudeB];
  if (values.some((value) => Number.isNaN(value))) {
	throw new Error("Invalid coordinates: latitude and longitude must be numbers");
  }

  const dLat = toRadians(latitudeB - latitudeA);
  const dLon = toRadians(longitudeB - longitudeA);
  const lat1 = toRadians(latitudeA);
  const lat2 = toRadians(latitudeB);

  const a = (
	Math.sin(dLat / 2) ** 2
	+ Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  );

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
};

export const findClosestPlantMatch = ({ person, locations, locationNames = [], powerPlants }) => {
  if (!Array.isArray(locations) || locations.length === 0) {
	locations = [];
  }

  if (!Array.isArray(powerPlants) || powerPlants.length === 0) {
	throw new Error("Power plant list is empty");
  }

  let bestMatch = null;

  const coordinatePlants = powerPlants.filter((plant) => hasCoordinates(plant));
  const coordinateLocations = locations.filter((location) => hasCoordinates(location));

  if (coordinatePlants.length > 0 && coordinateLocations.length > 0) {
	for (const location of coordinateLocations) {
	  for (const powerPlant of coordinatePlants) {
		const distanceKm = haversineKm(location, powerPlant);

		if (!bestMatch || distanceKm < bestMatch.distanceKm) {
		  bestMatch = {
			name: person.name,
			surname: person.surname,
			birthYear: person.birthYear,
			matchType: "coordinates",
			personLocation: {
			  latitude: Number(location.latitude),
			  longitude: Number(location.longitude)
			},
			powerPlant: {
			  code: powerPlant.code,
			  ...(powerPlant.city ? { city: powerPlant.city } : {}),
			  latitude: Number(powerPlant.latitude),
			  longitude: Number(powerPlant.longitude)
			},
			distanceKm: Number(distanceKm.toFixed(3))
		  };
		}
	  }
	}

	return bestMatch;
  }

  const plantsByCity = new Map(
	powerPlants
	  .filter((plant) => typeof plant.city === "string" && plant.city.trim())
	  .map((plant) => [normalizeText(plant.city), plant])
  );

  for (const city of locationNames) {
	const plant = plantsByCity.get(normalizeText(city));
	if (!plant) {
	  continue;
	}

	return {
	  name: person.name,
	  surname: person.surname,
	  birthYear: person.birthYear,
	  matchType: "city",
	  personLocation: { city },
	  powerPlant: {
		code: plant.code,
		city: plant.city
	  },
	  distanceKm: 0
	};
  }

  return null;
};

