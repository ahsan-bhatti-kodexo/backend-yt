import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiErrors } from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadCloudinary } from "../utils/cloudinary.js";

const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  // validate user details - not empty, valid email, password length, etc.
  // check if user already exists in the database
  // check for images , check for avatar
  // upload them to cloudinary
  // create user  object in the database
  // remove password and refresh token from the user object
  // check for user creation
  // return res

  // get user details from frontend
  // validate user details - not empty, valid email, password length, etc. (Done)
  const { username, email, password, fullName } = req.body;
  console.log("User details: ", username, email, password, fullName);

  if (
    [username, email, password, fullName].some((field) => field?.trim() === "")
  ) {
    throw new ApiErrors(400, "All fields are required");
  }

  // check if user already exists in the database (Done)
  const existingUser = User.findOne({
    $or: [{ username }, { email }],
  });
  if (existingUser) {
    throw new ApiErrors(409, "User already exists");
  }

  // check for images , check for avatar (Done)
  const avatar = req.files?.avatar[0]?.path;
  const coverImage = req.files?.coverImage[0]?.path;

  if (!avatar) {
    throw new ApiErrors(400, "Avatar is required");
  }

  // upload them to cloudinary (Done)
  const avatarUrl = await uploadCloudinary(avatar);
  const coverImageUrl = coverImage ? await uploadCloudinary(coverImage) : null;

  if (!avatarUrl) {
    throw new ApiErrors(500, "Error uploading avatar to Cloudinary");
  }

  // create user object in the database (Done)

  const userDetails = await User.create({
    username,
    email,
    password,
    fullName,
    avatar: avatarUrl.url,
    coverImage: coverImageUrl?.url || "",
  });

  // check for user creation (Done)
  // remove password and refresh token from the user object (Done)

  const createdUser = await User.findById(userDetails._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiErrors(500, "Error creating user");
  }

  // return res
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User created successfully"));
});

export { registerUser };
