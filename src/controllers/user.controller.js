import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiErrors } from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadCloudinary } from "../utils/cloudinary.js";
import fs from "fs";
import jwt from "jsonwebtoken";

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

  if (password.length < 6) {
    throw new ApiErrors(400, "Password must be at least 6 characters");
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
  // get the refresh token from the request
  // find the user in the database
  // check if the refresh token is valid
  // delete the refresh token from the database
  // return the response

  // get the refresh token from the request (Done)
  // Below steps are done in middleware (verifyJWT)
  //                \/
  // find the user in the database (Done)
  // check if the refresh token is valid (Done)

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

  // delete the refresh token from the database (Done)

  const option = {
    httpOnly: true,
    secure: true,
  };

  // return the response (Done)
  return res
    .status(200)
    .clearCookie("accessToken", option)
    .clearCookie("refreshToken", option)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  // get the refresh token from the request
  // verify the refresh token
  // find the user in the database
  // check if the refresh token is valid
  // generate new access token and refresh token
  // save the new refresh token in the database
  // return the new access token and refresh token

  // get the refresh token from the request (Done)

  const incomingRefreshtoken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshtoken) {
    throw new ApiErrors(401, "Unauthorized request");
  }
  try {
    // verify the refresh token (Done)
    const decodedToken = jwt.verify(
      incomingRefreshtoken,
      process.env.REFRESH_TOKEN_SECRET
    );

    // find the user in the database (Done)
    const user = await User.findById(decodedToken.id);

    if (!user) {
      throw new ApiErrors(404, "User not found");
    }

    // check if the refresh token is valid (Done)
    if (incomingRefreshtoken !== user.refreshToken) {
      throw new ApiErrors(401, "Refresh token is expired or used");
    }

    // generate new access token and refresh token (Done)
    // save the new refresh token in the database (Done)
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user._id
    );

    // return the new access token and refresh token (Done)
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
            accessToken,
            refreshToken,
          },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
    console.log("error while refreshing token", error);
    throw new ApiErrors(500, "Something went wrong while refreshing token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  // get the user id from the request
  // get the user details from the request
  // validate the user details - not empty, old password, new password length, etc.
  // find the user in the database
  // check for password match
  // update the password in the database
  // return the response

  // get the old password and new password from the request body (Done)
  const { oldPassword, newPassword, confirmPassword } = req.body;

  // check for new  password and confirm password match

  if (newPassword !== confirmPassword) {
    throw new ApiErrors(400, "New password and confirm password do not match");
  }

  // validate the user details - not empty, old password, new password length, etc. (Done)
  if (!oldPassword || !newPassword) {
    throw new ApiErrors(400, "Old password and new password are required");
  }
  // check for password length (6 characters) (Done)
  if (newPassword.length < 6) {
    throw new ApiErrors(400, "New password must be at least 6 characters");
  }

  // request user id from the request (Done)
  // find the user in the database (Done)
  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiErrors(404, "User not found");
  }

  // check for password match (Done)
  const isPasswordMatched = await user.comparePassword(oldPassword);

  if (!isPasswordMatched) {
    throw new ApiErrors(400, "Old password is incorrect");
  }

  // update the password in the database (Done)
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password updated successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  // get the fullName , username from the request
  // validate the user details - not empty, fullName, username length, etc.
  // check if the user exists in the database
  // if user exists, update the user details in the database
  // return the response

  // get the fullName , username from the request (Done)
  const { fullName, username } = req.body;
  // validate the user details - not empty, fullName, username length, etc. (Done)
  if (!fullName || !username) {
    throw new ApiErrors(400, "Full name and username are required");
  }
  if (fullName.length < 3 || username.length < 3) {
    throw new ApiErrors(
      400,
      "Full name and username must be at least 3 characters"
    );
  }

  // check if the user exists in the database (Done)
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        fullName,
        username,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");

  if (!user) {
    throw new ApiErrors(404, "User not found");
  }

  // return the response (Done)
  return res
    .status(200)
    .json(new ApiResponse(200, user, "User details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  // get the avatar from the request
  // upload the avatar to cloudinary
  // update the avatar in the database
  // return the response

  // get the avatar from the request (Done)
  const avatarLocalPath = req.file?.path;

  // check if the avatar is present
  if (!avatarLocalPath) {
    throw new ApiErrors(400, "Avatar is required");
  }

  // upload the avatar to cloudinary (Done)
  const avatar = await uploadCloudinary(avatarLocalPath);

  if (!avatar) {
    throw new ApiErrors(500, "Error uploading avatar to Cloudinary");
  }

  // update the avatar in the database (Done)
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");

  if (!user) {
    throw new ApiErrors(404, "User not found");
  }

  // return the response (Done)
  return res
    .status(200)
    .json(new ApiResponse(200, user, "User avatar updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  // get the coverImage from the request
  // upload the coverImage to cloudinary
  // update the coverImage in the database
  // return the response

  // get the coverImage from the request (Done)
  const coverImageLocalPath = req.file?.path;

  // check if the coverImage is present
  if (!coverImageLocalPath) {
    throw new ApiErrors(400, "Cover image is required");
  }

  // upload the coverImage to cloudinary (Done)
  const coverImage = await uploadCloudinary(coverImageLocalPath);

  if (!coverImage) {
    throw new ApiErrors(500, "Error uploading cover image to Cloudinary");
  }

  // update the coverImage in the database (Done)
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");

  if (!user) {
    throw new ApiErrors(404, "User not found");
  }

  // return the response (Done)
  return res
    .status(200)
    .json(new ApiResponse(200, user, "User cover image updated successfully"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
};
