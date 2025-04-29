import { ApiErrors } from "../utils/ApiErrors.js";
import { asyncHanlder } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHanlder(async (req, _, next) => {
  try {
    // check if the token is present in the request header or cookies
    const token =
      req.cookies?.accessToken ||
      req.headers?.authorization?.replace(/^Bearer\s/, "");

    if (!token) {
      throw new ApiErrors(401, "Access token is required");
    }

    // verify the token
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // check if the user exists in the database
    const user = await User.findById(decodedToken.id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new ApiErrors(401, "Invalid access token");
    }

    // attach the user to the request object
    req.user = user;

    // call the next middleware
    next();
  } catch (error) {
    throw new ApiErrors(401, error?.message || "Invalid access token");
  }
});
