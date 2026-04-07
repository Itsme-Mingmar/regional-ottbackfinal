import mongoose from "mongoose";

const watchHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
      required: true,
    },

    progress: {
      type: Number, // seconds watched
      default: 0,
    },

    completed: {
      type: Boolean,
      default: false,
    },

    watchedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

/*
  Prevent duplicate history for same user + video
*/
watchHistorySchema.index({ user: 1, video: 1 }, { unique: true });

const WatchHistory =
  mongoose.models.WatchHistory ||
  mongoose.model("WatchHistory", watchHistorySchema);

export default WatchHistory;