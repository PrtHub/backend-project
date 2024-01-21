import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

  // retreive all videos from the databases
  // apply the query based filtering if the query is present
  // Sort video besed on sortBy and sortType
  // retrieve the appropriate page of videos based on the page number and the limit

  try {
    let aggregationPipeline = [];

    //filters videos based on a case-insensitive regular expression match in the title field
    if (query) {
      aggregationPipeline.push({
        $match: {
          title: {
            $regex: query,
            $options: "i",
          },
        },
      });
    }

    if (userId) {
      aggregationPipeline.push({
        $match: { userId: userId },
      });
    }

    // arranges videos in a specified order based on a given field and direction.
    if (sortBy) {
      aggregationPipeline.push({
        $sort: { [sortBy]: sortType },
      });
    }

    const videos = await Video.aggregatePaginate({
      pipeline: aggregationPipeline,
      page,
      limit,
    });

    return res
      .status(200)
      .json(new ApiResponse(200, videos, "videos fetched successfully"));
  } catch (error) {
    throw new ApiError(500, "Error while fetching videos");
  }
});

const publishAVideo = asyncHandler(async (req, res) => {
  // Retrieves these values from `req.body`
  // Get the video file from the request
  // Upload the video to Cloudinary
  // Create a new video document in the database

    const { title, description } = req.body;

    if ([title, description].some((field) => field.trim() === "")) {
      throw new ApiError(400, "All fields mustn't be empty");
    }

    const videoLocalpath = req.files?.videoFile[0].path;
    const thumbnailLocalpath = req.files?.thumbnail[0].path;

    if (!videoLocalpath) {
      throw new ApiError(400, "video is required");
    }
    if (!thumbnailLocalpath) {
      throw new ApiError(400, "thumbnail is required");
    }

    const uploadedVideoFile = await uploadOnCloudinary(videoLocalpath);
    const uploadedThumbnailFile = await uploadOnCloudinary(thumbnailLocalpath);

    if (!uploadedVideoFile) {
      throw new ApiError(400, "Video upload is required");
    }
    if (!uploadedThumbnailFile) {
      throw new ApiError(400, "Video upload is required");
    }

    const video = await Video.create({
      videoFile: uploadedVideoFile.secure_url,
      thumbnail: uploadedThumbnailFile.secure_url,
      title,
      description,
    });

    console.log(video);

    return res
      .status(200)
      .json(new ApiResponse(200, video, "publish the video successfully"));
 
});

export { getAllVideos, publishAVideo };
