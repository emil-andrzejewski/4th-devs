import { paths } from "../config.js";
import { readJsonFile, writeJsonFile } from "../io.js";
import { findClosestPlantMatch } from "../geo.js";
import { fetchPersonLocations, fetchPowerPlants } from "../hubApi.js";

export const runFindCandidate = async () => {
  const suspects = await readJsonFile(paths.suspects, "output/suspects.json");

  if (!Array.isArray(suspects) || suspects.length === 0) {
	throw new Error("Suspects list is empty. Run step 1 first.");
  }

  const { plants, raw: plantsRaw, url } = await fetchPowerPlants();

  await writeJsonFile(paths.powerPlants, {
	sourceUrl: url,
	count: plants.length,
	plants,
	raw: plantsRaw
  });

  const scan = [];
  let globalBest = null;

  for (const suspect of suspects) {
	try {
	  const { locations, locationNames, raw } = await fetchPersonLocations(suspect);
	  const bestForPerson = findClosestPlantMatch({
		person: suspect,
		locations,
		locationNames,
		powerPlants: plants
	  });

	  scan.push({
		name: suspect.name,
		surname: suspect.surname,
		birthYear: suspect.birthYear,
		locationsCount: locations.length,
		locationNames,
		bestMatch: bestForPerson,
		raw
	  });

	  if (bestForPerson && (!globalBest || bestForPerson.distanceKm < globalBest.distanceKm)) {
		globalBest = bestForPerson;
	  }
	} catch (error) {
	  scan.push({
		name: suspect.name,
		surname: suspect.surname,
		birthYear: suspect.birthYear,
		error: error.message
	  });
	}
  }

  await writeJsonFile(paths.locationsScan, scan);

  if (!globalBest) {
	const successfulChecks = scan.filter((item) => !item.error).length;
	const failedChecks = scan.length - successfulChecks;
	throw new Error(
	  `No candidate found. Successful location checks: ${successfulChecks}, failed checks: ${failedChecks}. `
	  + `See ${paths.locationsScan} for details.`
	);
  }

  await writeJsonFile(paths.candidateLocation, globalBest);

  return {
	suspectsChecked: suspects.length,
	candidate: globalBest,
	outputPath: paths.candidateLocation
  };
};

