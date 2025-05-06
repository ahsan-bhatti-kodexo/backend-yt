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

  console.log(
    "query",
    query,
    "sortBy",
    sortBy,
    "sortType",
    sortType,
    "userId",
    userId
  );

  const aggregateQuery = Video.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
      },
    },
    {
      $unwind: {
        path: "$owner",
      },
    },
    {
      $project: {
        title: 1,
        description: 1,
        videoFileUrl: 1,
        thumbnailUrl: 1,
        duration: 1,
        views: 1,
        isPublished: 1,
        createdAt: 1,
        updatedAt: 1,
        owner: {
          _id: "$owner._id",
          username: "$owner.username",
          fullName: "$owner.fullName",
          email: "$owner.email",
          avatar: "$owner.avatar",
        },
      },
    },
  ]);

  if (query) {
    aggregateQuery.match({
      $or: [
        { title: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
      ],
    });
  }

  if (userId) {
    aggregateQuery.match({
      "owner._id": new mongoose.Types.ObjectId(userId),
    });
  }

  if (sortBy && sortType) {
    aggregateQuery.sort({
      [sortBy]: sortType === "asc" ? 1 : -1,
    });
  } else {
    aggregateQuery.sort({
      createdAt: -1,
    });
  }
  // Pagination
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
  };
  const videos = await Video.aggregatePaginate(aggregateQuery, options);

  const { docs, ...restVideoData } = videos;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        videos: docs,
        ...restVideoData,
      },
      "Videos fetched successfully"
    )
  );
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

  // check if videoId is valid
  // find video by id
  // check if video exists
  // check if video is published
  // update the user watch history
  // update views count
  // return video details

  // check if videoId is valid
  if (!isValidObjectId(videoId)) {
    throw new ApiErrors(400, "Invalid video id");
  }

  // find video by id
  const videoDetails = await Video.findById(videoId).populate("owner", [
    "username",
    "fullName",
    "email",
    "avatar",
  ]);

  // check if video exists
  if (!videoDetails) {
    throw new ApiErrors(404, "Video not found");
  }
  // check if video is published
  if (!videoDetails.isPublished) {
    throw new ApiErrors(404, "Video not found");
  }

  // update the user watch history
  const userId = req.user._id;
  const userDetails = await User.findById(userId);
  if (!userDetails) {
    throw new ApiErrors(404, "User not found");
  }
  if (!userDetails.watchHistory.includes(videoId)) {
    userDetails.watchHistory.push(videoId);
    await userDetails.save();
    // update views count
    videoDetails.views += 1;
    await videoDetails.save();
  }
  // return video details
  return res
    .status(200)
    .json(new ApiResponse(200, videoDetails, "Video fetched successfully"));
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
  if (!isValidObjectId(videoId)) {
    throw new ApiErrors(400, "Invalid video id");
  }

  const videoDetails = await Video.findById(videoId).select("isPublished");
  if (!videoDetails) {
    throw new ApiErrors(404, "Video not found");
  }

  const isPublished = videoDetails.isPublished;

  // toggle publish status
  videoDetails.isPublished = !isPublished;
  await videoDetails.save();

  if (!videoDetails) {
    throw new ApiErrors(404, "Video not found");
  }

  return res.status(200).json({
    success: true,
    message: `Video ${isPublished ? "unpublished" : "published"} successfully`,
  });
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
