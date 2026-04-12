import WatchHistory from '../models/WatchHistory.js';
import Video from '../models/Video.js';
import apiResponse from '../utils/apiResponse.js';
import apiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';

// POST /api/watch/start
// Create or update watch history when user starts watching a video.
const startWatch = asyncHandler(async (req, res) => {
    const userId = req.user._id; // from authenticated user
    const { videoId } = req.body;

    if (!videoId) {
        throw new apiError(400, "Video ID is required");
    }

    // Use findOneAndUpdate with upsert:true to avoid duplicates
    const watchHistory = await WatchHistory.findOneAndUpdate(
        { user: userId, video: videoId }, // filter
        {
            user: userId,
            video: videoId,
            progress: 0, // default progress
            completed: false, // default completed status
            watchedAt: new Date(),
        },
        {
            upsert: true, // Create if doesn't exist, update if exists
            returnDocument: "after" // Return updated document
        }
    );

    // Increment video views by 1
    await Video.findByIdAndUpdate(
        videoId,
        { $inc: { views: 1 } }, // increment views by 1
        { new: true }
    );

    return res.status(200).json(
        new apiResponse(200, watchHistory, "Watch history created/updated successfully")
    );
});

// GET /api/watch/history
// Get all watched videos for logged-in user.
const getWatchHistory = asyncHandler(async (req, res) => {
    const userId = req.user._id; // from authenticated user

    // Find watch history by userId, populate video details, sort by watchedAt descending
    const watchHistory = await WatchHistory.find({ user: userId })
        .populate('video', 'title thumbnailUrl duration genre category') // populate video details
        .sort({ watchedAt: -1 }) // sort by watchedAt descending (latest first)
        .lean(); // optimize by returning plain objects

    if (!watchHistory || watchHistory.length === 0) {
        return res.status(200).json(
            new apiResponse(200, [], "No watch history found")
        );
    }

    return res.status(200).json(
        new apiResponse(200, watchHistory, "Watch history retrieved successfully")
    );
});

export { startWatch, getWatchHistory };
