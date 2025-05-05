import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiErrors } from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  // TODO: toggle subscription

  if (!isValidObjectId(channelId)) {
    throw new ApiErrors(400, "Invalid channelId");
  }

  // check if user is trying to subscribe to his own channel

  if (String(req.user?._id) === channelId) {
    throw new ApiErrors(400, "You cannot subscribe to your own channel");
  }
  console.log(
    "channelId",
    channelId,
    new mongoose.Types.ObjectId(req.user?._id)
  );

  const isSubscribed = await Subscription.findOne({
    subscriber: req.user?._id,
    channel: channelId,
  });

  if (isSubscribed) {
    await Subscription.findByIdAndDelete(isSubscribed?._id);

    return res
      .status(200)
      .json(
        new ApiResponse(200, { subscribed: false }, "unsunscribed successfully")
      );
  }

  await Subscription.create({
    subscriber: req.user?._id,
    channel: channelId,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, { subscribed: true }, "subscribed successfully")
    );
});

// controller to return subscriber list of a channel
// const getUserChannelSubscribers = asyncHandler(async (req, res) => {
//   let { channelId } = req.params;

//   if (!isValidObjectId(channelId)) {
//     throw new ApiErrors(400, "Invalid channelId");
//   }

//   channelId = new mongoose.Types.ObjectId(channelId);

//   const subscribers = await Subscription.aggregate([
//     {
//       $match: {
//         channel: channelId,
//       },
//     },
//     {
//       $lookup: {
//         from: "users",
//         localField: "subscriber",
//         foreignField: "_id",
//         as: "subscriber",
//         pipeline: [
//           {
//             $lookup: {
//               from: "subscriptions",
//               localField: "_id",
//               foreignField: "channel",
//               as: "subscribedToSubscriber",
//             },
//           },
//           {
//             $addFields: {
//               subscribedToSubscriber: {
//                 $cond: {
//                   if: {
//                     $in: [channelId, "$subscribedToSubscriber.subscriber"],
//                   },
//                   then: true,
//                   else: false,
//                 },
//               },
//               subscribersCount: {
//                 $size: "$subscribedToSubscriber",
//               },
//             },
//           },
//         ],
//       },
//     },
//     {
//       $unwind: "$subscriber",
//     },
//     {
//       $project: {
//         _id: 0,
//         subscriber: {
//           _id: 1,
//           username: 1,
//           fullName: 1,
//           "avatar.url": 1,
//           subscribedToSubscriber: 1,
//           subscribersCount: 1,
//         },
//       },
//     },
//   ]);

//   return res
//     .status(200)
//     .json(
//       new ApiResponse(200, subscribers, "subscribers fetched successfully")
//     );
// });

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  console.log("req.params", req.user);

  if (!isValidObjectId(channelId)) {
    throw new ApiErrors(400, "Invalid channelId");
  }

  const subscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscribers",
      },
    },

    { $unwind: "$subscribers" },
    {
      $replaceRoot: {
        newRoot: "$subscribers",
      },
    },
    {
      $project: {
        // subscribers: {
        _id: 1,
        username: 1,
        fullName: 1,
        avatar: 1,
        isSubscribedByMe: 1,
        // },
      },
    },
  ]);

  // Get all userIds that the current user is subscribed to
  const mySubscriptions = await Subscription.find({
    channel: req.user._id,
  }).select("subscriber");

  const mySubscribedUserIds = mySubscriptions.map((s) =>
    s.subscriber.toString()
  );

  // Mark each subscriber with isSubscribedByMe
  const result = subscribers.map((user) => ({
    ...user,
    isSubscribedByMe: mySubscribedUserIds.includes(user._id.toString()),
  }));

  return res
    .status(200)
    .json(new ApiResponse(200, result, "subscribers fetched successfully"));
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  const matchCondition = subscriberId
    ? { subscriber: new mongoose.Types.ObjectId(subscriberId) }
    : {};

  const subscribedChannels = await Subscription.aggregate([
    {
      $match: matchCondition,
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "subscribedChannel",
      },
    },
    {
      $unwind: "$subscribedChannel",
    },
    {
      $project: {
        _id: 0,
        subscribedChannel: {
          _id: 1,
          username: 1,
          fullName: 1,
          avatar: 1,
          email: 1,
        },
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscribedChannels,
        "subscribed channels fetched successfully"
      )
    );
});
export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
