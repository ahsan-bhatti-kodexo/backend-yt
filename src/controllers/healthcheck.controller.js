import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const healthcheck = asyncHandler(async (req, res) => {
  //TODO: build a healthcheck response that simply returns the OK status as json with a message

  const response = new ApiResponse({
    statusCode: 200,
    message: "OK",
  });

  return res.status(200).json(response);
});

export { healthcheck };
