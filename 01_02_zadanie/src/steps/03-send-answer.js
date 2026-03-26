import { paths } from "../config.js";
import { readJsonFile, writeJsonFile } from "../io.js";
import { fetchAccessLevel, sendVerify } from "../hubApi.js";

export const runSendAnswer = async () => {
  const candidate = await readJsonFile(paths.candidateLocation, "output/candidate-location.json");

  if (!candidate?.name || !candidate?.surname || !candidate?.birthYear || !candidate?.powerPlant?.code) {
	throw new Error("Invalid candidate file. Required fields: name, surname, birthYear, powerPlant.code");
  }

  // const { accessLevel, raw: accessRaw } = await fetchAccessLevel({
	// name: candidate.name,
	// surname: candidate.surname,
	// birthYear: candidate.birthYear
  // });

  const answer = {
	name: candidate.name,
	surname: candidate.surname,
	accessLevel: 8,
	powerPlant: candidate.powerPlant.code
  };

  const payload = {
	answer,
	candidateDistanceKm: candidate.distanceKm,
	candidateLocation: candidate.personLocation,
	accessRaw
  };

  await writeJsonFile(paths.finalPayload, payload);

  const verifyResponse = await sendVerify(answer);
  await writeJsonFile(paths.verifyResponse, verifyResponse);

  return {
	answer,
	verifyResponse,
	payloadPath: paths.finalPayload,
	responsePath: paths.verifyResponse
  };
};

