import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiErrors } from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadCloudinary } from "../utils/cloudinary.js";
import fs from "fs";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return {
      accessToken,
      refreshToken,
    };
  } catch (error) {
    console.log(error);
    throw new ApiErrors(500, "Something went wrong while generating tokens");
  }
};

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
  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existingUser) {
    fs.unlinkSync(req.files?.avatar[0]?.path); // Delete the locally saved temporary file
    req.files?.coverImage && fs.unlinkSync(req.files?.coverImage[0]?.path); // Delete the locally saved temporary file

    throw new ApiErrors(409, "User already exists");
  }

  // check for images , check for avatar (Done)
  const avatar = req.files?.avatar[0]?.path;
  const coverImage = req.files?.coverImage
    ? req.files?.coverImage[0]?.path
    : null;

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

const loginUser = asyncHandler(async (req, res) => {
  //  get user details from frontend
  // validate user details - not empty, valid email and username, password length, etc.
  // find the user in the database
  // check for password match
  // generate access token and refresh token
  // save refresh token in the database
  // return user details with access token and refresh token

  //  get user details from frontend (Done)
  const { email, username, password } = req.body;

  // validate user details - not empty, valid email and username, password length, etc.
  if (!(username || email)) {
    throw new ApiErrors(400, "Username or email is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  // find the user in the database
  if (!user) {
    throw new ApiErrors(404, "User not found");
  }

  // check for password match (Done)
  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    throw new ApiErrors(401, "Invalid user credentials");
  }

  // generate access token and refresh token  (Done)
  // save refresh token in the database (Done)

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const option = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, option)
    .cookie("refreshToken", refreshToken, option)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const option = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", option)
    .clearCookie("refreshToken", option)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

export { registerUser, loginUser, logoutUser };
