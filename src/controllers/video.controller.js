import Video from '../models/Video.js';
import apiResponse from "../utils/apiResponse.js";
import apiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import cloudinary from '../config/cloudinary.js';
import Province from '../models/Province.js';

// GET /api/video/movies
// Return all videos of category "movie" ordered by views
const getAllMovies = asyncHandler(async (req, res) => {
    const movies = await Video.find({ category: "movie" })
        .select("title releaseYear thumbnailUrl")
        .sort({ views: -1 });

    return res.status(200).json(
        new apiResponse(200, movies, "Movies retrieved successfully")
    );
});

// GET /api/video
// Fetch all videos regardless of category
const getAllVideos = asyncHandler(async (req, res) => {
    const videos = await Video.find({})
        .sort({ views: -1 })
        .populate('province', 'name')
        .populate('uploadedBy', 'name')
        .lean();

    return res
        .status(200)
        .json(new apiResponse(200, videos, "Videos retrieved successfully"));
});

// GET /api/video/nepali-movies
// Retrieve movies that belong to any province (province not null)
const getNepaliMovies = asyncHandler(async (req, res) => {
    const movies = await Video.find({
        category: "movie",
        province: { $ne: null }
    })
        .select("title releaseYear thumbnailUrl")
        .populate("province", "name")
        .sort({ views: -1 });

    return res.status(200).json(
        new apiResponse(200, movies, "Nepali movies retrieved successfully")
    );
});

// GET /api/video/search
// Search only in movies (exclude documentaries and cultural)
// query parameter: q (search term)
const searchMovies = asyncHandler(async (req, res) => {
    const { q } = req.query;
    if (!q) {
        throw new apiError(400, "Search query parameter 'q' is required");
    }

    const regex = new RegExp(q, 'i');
    const movies = await Video.find({
        category: "movie",
        $or: [
            { title: regex },
            { description: regex },
            { genre: regex }
        ]
    })
        .sort({ views: -1 })
        .populate('uploadedBy', 'name')
        .populate('province', 'name');

    return res
        .status(200)
        .json(new apiResponse(200, movies, "Search results retrieved successfully"));
});
const getProvinceVideos = asyncHandler(async (req, res) => {
    const { slug, category } = req.params;
    const { limit = 6 } = req.query;

    // 1️⃣ Find province by slug
    const province = await Province.findOne({ slug });

    if (!province) {
        throw new apiError(404, "Province not found");
    }

    // 2️⃣ Fetch videos using province._id
    const videos = await Video.find({
        province: province._id,
        category: category
    })
        .select("title thumbnailUrl")
        .sort({ views: -1 })
        .limit(parseInt(limit))
        .lean();

    return res.status(200).json(
        new apiResponse(200, videos, "Province videos fetched successfully")
    );
});
// GET /api/provinces
// Fetch and return all provinces, sorted alphabetically by name
const getAllProvinces = asyncHandler(async (req, res) => {
    const provinces = await Province.find({}).sort({ name: 1 });
    return res
        .status(200)
        .json(new apiResponse(200, provinces, "Provinces retrieved successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!videoId) {
        throw new apiError(400, "Video ID is required");
    }

    const video = await Video.findById(videoId)
        .select("title description videoUrl thumbnailUrl duration genre releaseYear province") // ✅ only needed fields
        .populate('province', 'name');

    if (!video) {
        throw new apiError(404, "Video not found");
    }

    return res.status(200).json(
        new apiResponse(200, video, "Video retrieved successfully")
    );
});

const uploadVideo = asyncHandler(async (req, res) => {
    const {
        title,
        description,
        genre,
        language,
        releaseYear,
        duration,
        category,
        province
    } = req.body;

    // Validate required fields
    if (!title || !description || !genre || !language || !releaseYear || !duration || !category) {
        throw new apiError(400, "All fields are required");
    }

    // Check if files were uploaded
    if (!req.files || !req.files.video || !req.files.thumbnail) {
        throw new apiError(400, "Both video and thumbnail files are required");
    }

    const videoUrl = req.files.video[0].path; // Cloudinary secure_url for video
    const thumbnailUrl = req.files.thumbnail[0].path; // Cloudinary secure_url for thumbnail

    // Find province by name and get its ObjectId (or null if not found)
    let provinceId = null;
    if (province) {
        const provinceExists = await Province.findOne({ slug: province });
        if (provinceExists) {
            provinceId = provinceExists._id;
        }
    }

    // Create video document
    const video = await Video.create({
        title,
        description,
        genre,
        language,
        releaseYear: parseInt(releaseYear),
        videoUrl,
        thumbnailUrl,
        duration: parseInt(duration),
        category,
        province: provinceId,
        uploadedBy: req.user._id,
    });

    return res
        .status(201)
        .json(new apiResponse(201, {
            _id: video._id,
            title: video.title,
            category: video.category
        }, "Video uploaded successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!videoId) {
        throw new apiError(400, "Video ID is required");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new apiError(404, "Video not found");
    }

    // allow updating any of the basic fields
    const updatableFields = [
        'title',
        'description',
        'genre',
        'language',
        'releaseYear',
        'duration',
        'category',
        'province'
    ];

    for (const field of updatableFields) {
        if (req.body[field] !== undefined) {
            // parse integers where appropriate
            if (field === 'releaseYear' || field === 'duration') {
                video[field] = parseInt(req.body[field]);
            } else if (field === 'province') {
                // Handle province: convert province name to ObjectId
                if (req.body[field]) {
                    const provinceExists = await Province.findOne({ name: req.body[field] });
                    video[field] = provinceExists ? provinceExists._id : null;
                } else {
                    video[field] = null;
                }
            } else {
                video[field] = req.body[field];
            }
        }
    }

    // handle new upload URLs if files were provided
    if (req.files) {
        if (req.files.video && req.files.video[0]) {
            video.videoUrl = req.files.video[0].path;
        }
        if (req.files.thumbnail && req.files.thumbnail[0]) {
            video.thumbnailUrl = req.files.thumbnail[0].path;
        }
    }

    await video.save();

    return res
        .status(200)
        .json(new apiResponse(200, video, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!videoId) {
        throw new apiError(400, "Video ID is required");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new apiError(404, "Video not found");
    }

    const getPublicId = (url) => {
        const decodedUrl = decodeURIComponent(url); 

        const parts = decodedUrl.split('/');
        const uploadIndex = parts.indexOf("upload");
        const afterUpload = parts.slice(uploadIndex + 1);

        if (afterUpload[0].startsWith("v")) {
            afterUpload.shift();
        }

        return afterUpload.join('/').split('.')[0];
    };

    const videoPublicId = getPublicId(video.videoUrl);
    const thumbnailPublicId = getPublicId(video.thumbnailUrl);

    try {
        await cloudinary.uploader.destroy(videoPublicId, {
            resource_type: "video",
            invalidate: true
        });

        await cloudinary.uploader.destroy(thumbnailPublicId, {
            invalidate: true
        });

    } catch (err) {
        console.error("Cloudinary delete error:", err);
    }

    await Video.findByIdAndDelete(videoId);

    return res.status(200).json(
        new apiResponse(200, null, "Video deleted successfully")
    );
});

export {
    getAllVideos,
    getAllMovies,
    getNepaliMovies,
    searchMovies,
    getVideoById,
    uploadVideo,
    updateVideo,
    deleteVideo,
    getProvinceVideos,
    getAllProvinces
}; 