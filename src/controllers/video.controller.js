import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiErrors } from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  // TODO: get video, upload to cloudinary, create video

  // check if title and description is provided
  if (!title || !description) {
    throw new ApiErrors(400, "Please provide title and description");
  }

  // upload video and thumbnail to cloudinary
  const videoFile = req.files?.videoFileUrl[0].path;
  const thumbnail = req.files?.thumbnailUrl[0].path;

  console.log("videoFile", videoFile, "thumbnail", thumbnail);

  if (!videoFile && !thumbnail) {
    throw new ApiErrors(400, "Please provide video and thumbnail");
  }

  const videoFileUrl = await uploadCloudinary(videoFile);
  const thumbnailUrl = await uploadCloudinary(thumbnail);

  if (!videoFileUrl || !thumbnailUrl) {
    throw new ApiErrors(
      400,
      "Error uploading video or thumbnail to cloudinary"
    );
  }

  const duration = videoFileUrl?.duration;

  const owner = req.user._id;

  const videoDetails = await Video.create({
    title,
    description,
    videoFileUrl: videoFileUrl.secure_url,
    thumbnailUrl: thumbnailUrl.secure_url,
    duration: duration || 0,
    views: 0,
    isPublished: true,
    owner,
  });

  console.log("videoDetails", videoDetails);

  return res
    .status(200)
    .json(new ApiResponse(200, videoDetails, "Video created successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: update video details like title, description, thumbnail
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
