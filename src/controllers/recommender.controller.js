import WatchHistory from "../models/WatchHistory.js";
import Video from "../models/Video.js";
import axios from "axios";

export const getRecommendations = async (req, res) => {
  try {
    const userId = req.user._id;
    const { excludeId } = req.query; 

    // 1. Get recent watch history
    const history = await WatchHistory.find({ user: userId })
      .sort({ watchedAt: -1 })
      .limit(2)
      .populate({
        path: "video",
        select: "title category",
      });

    const userLikes = [...new Set(
      history
        .filter(h => h.video && h.video.title && h.video.category === "movie")
        .map(h => h.video.title)
    )].slice(0, 2);

    // Helper fallback
    const getTrendingMovies = async () => {
      return await Video.find({ category: "movie" })
        .sort({ views: -1 })
        .limit(4)
        .select("title thumbnailUrl");
    };

    // 2. Cold start fallback
    if (userLikes.length === 0) {
      const trending = await getTrendingMovies();
      return res.json(trending);
    }

    // 4. Call recommender service
    const response = await axios.post(
      `${process.env.RECOMMENDER_URL}/recommend`,
      { user_likes: userLikes },
      { timeout: 5000 }
    );

    const recommendedTitles = response.data.recommendations || [];

    if (recommendedTitles.length === 0) {
      const trending = await getTrendingMovies();
      return res.json(trending);
    }

    // 5. Fetch matching movies — exclude current video
    const movies = await Video.find({
      title: { $in: recommendedTitles },
      category: "movie",
      ...(excludeId && { _id: { $ne: excludeId } }), 
    }).select("title thumbnailUrl");

    // 6. Maintain recommendation order
    const moviesMap = new Map(
      movies.map((movie) => [movie.title, movie])
    );

    const orderedMovies = recommendedTitles
      .map((title) => moviesMap.get(title))
      .filter(Boolean)
      .slice(0, 4);

    return res.json(orderedMovies);
  } catch (error) {
    console.error("Recommendation error:", error.message);

    const trending = await Video.find({ category: "movie" })
      .sort({ views: -1 })
      .limit(4)
      .select("title thumbnailUrl");

    return res.json(trending);
  }
};