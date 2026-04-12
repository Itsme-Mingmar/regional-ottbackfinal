import { Router } from "express";
import {
  getAllVideos,
  getAllMovies,
  getVideoById,
  uploadVideo,
  updateVideo,
  deleteVideo,
  getProvinceVideos,
  getAllProvinces,
  getNepaliMovies,
} from "../controllers/video.controller.js";

import { uploadVideoAndThumbnail } from "../middleware/multer.middleware.js";
import verifyJWT from "../middleware/verifyJwt.middleware.js";
import roleVerify from "../middleware/role.middleware.js";

const videoRouter = Router();

// Upload video
videoRouter.post(
  "/upload",
  verifyJWT,
  roleVerify,
  uploadVideoAndThumbnail.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 }
  ]),
  uploadVideo
);

// Get all videos
videoRouter.get("/", getAllVideos);

// Movies
videoRouter.get("/movies", getAllMovies);

// Provinces list
videoRouter.get("/provinces", getAllProvinces);

// Nepali movies
videoRouter.get("/nepali-movies", getNepaliMovies);

// Province-based videos
videoRouter.get("/province/:slug/:category", getProvinceVideos);


// Get single video
videoRouter.get("/:videoId", getVideoById);

// Update video
videoRouter.put(
  "/:videoId",
  verifyJWT,
  roleVerify,
  uploadVideoAndThumbnail.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 }
  ]),
  updateVideo
);

// Delete video
videoRouter.delete(
  "/:videoId",
  verifyJWT,
  roleVerify,
  deleteVideo
);

export { videoRouter };