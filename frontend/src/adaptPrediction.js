// Maps the API_CONTRACT response into the shape components expect.
export function adaptPrediction(apiResponse) {
  if (!apiResponse) return null;
  return {
    overall_cad: apiResponse.overall_cad,
    vessels: apiResponse.vessels,
    meta: apiResponse.meta,
  };
}
