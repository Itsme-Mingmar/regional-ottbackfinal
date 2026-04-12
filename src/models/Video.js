import mongoose from "mongoose";

const videoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    genre: {
      type: [String],
      required: true,
      trim: true,
    },

    language: {
      type: String,
      required: true,
      trim: true,
    },

    releaseYear: {
      type: Number,
      required: true,
    },

    videoUrl: {
      type: String,
      required: true,
    },

    thumbnailUrl: {
      type: String,
      required: true,
    },

    duration: {
      type: Number, // duration in minutes
      required: true,
    },

    category: {
      type: String,
      enum: ["movie", "documentary", "cultural"],
      required: true,
    },

    province: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Province",
      default: null,
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    views: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, 
  }
);


// Faster filtering by province & category
videoSchema.index({ province: 1, category: 1 });

// Unique title per category (optional but useful)
videoSchema.index({ title: 1, category: 1 });

const Video =
  mongoose.models.Video ||
  mongoose.model("Video", videoSchema);
export default Video;