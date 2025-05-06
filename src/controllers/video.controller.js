import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiErrors } from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";

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

  const videosOwner = await User.findById(owner).select(
    "username fullName email avatar"
  );

  console.log("videosOwner", videosOwner);

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

  // console.log("videoDetails", videoDetails);

  // const responseVideoData = {
  //   ...videoDetails._doc,
  //   owner: videosOwner,
  // };
  // console.log("responseVideoData", responseVideoData);

  return res
    .status(200)
    .json(new ApiResponse(200, videoDetails, "Video created successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId, title, description } = req.body;
  //TODO: update video details like title, description, thumbnail
  if (!isValidObjectId(videoId)) {
    throw new ApiErrors(400, "Invalid video id");
  }

  if (!title && !description) {
    throw new ApiErrors(400, "Please provide title and description");
  }

  // upload video and thumbnail to cloudinary
  const videoFile = req.files?.videoFileUrl[0].path;
  const thumbnail = req.files?.thumbnailUrl[0].path;

  if (!videoFile && !thumbnail) {
    throw new ApiErrors(400, "Please provide video and thumbnail");
  }

  const videoFileUrl = await uploadCloudinary(videoFile);
  const thumbnailUrl = await uploadCloudinary(thumbnail);

  if (!videoFileUrl || !thumbnailUrl) {
    throw new ApiErrors(
      500,
      "Error uploading video or thumbnail to cloudinary"
    );
  }

  const videoDetails = await Video.findById(videoId);
  if (!videoDetails) {
    throw new ApiErrors(404, "Video not found");
  }
  // delete old video and thumbnail from cloudinary

  const oldVideoFileUrl = videoDetails.videoFileUrl;
  const oldThumbnailUrl = videoDetails.thumbnailUrl;

  console.log("oldVideoFileUrl", oldVideoFileUrl);
  console.log("oldThumbnailUrl", oldThumbnailUrl);

  await deleteFromCloudinary(oldVideoFileUrl, "video");
  await deleteFromCloudinary(oldThumbnailUrl, "image");

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title,
        description,
        videoFileUrl: videoFileUrl.secure_url,
        thumbnailUrl: thumbnailUrl.secure_url,
      },
    },
    { new: true }
  );

  console.log("updatedVideo", updatedVideo);
  return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video
  if (!isValidObjectId(videoId)) {
    throw new ApiErrors(400, "Invalid video id");
  }

  const videoDetails = await Video.findByIdAndDelete(videoId);

  if (!videoDetails) {
    throw new ApiErrors(404, "Video not found");
  }

  // delete video and thumbnail from cloudinary
  const oldVideoFileUrl = videoDetails.videoFileUrl;
  const oldThumbnailUrl = videoDetails.thumbnailUrl;

  await deleteFromCloudinary(oldVideoFileUrl, "video");
  await deleteFromCloudinary(oldThumbnailUrl, "image");
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted successfully"));
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
