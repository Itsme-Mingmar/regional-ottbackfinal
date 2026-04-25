import WatchHistory from "../models/WatchHistory.js";
import Video from "../models/Video.js";
import axios from "axios";

export const getRecommendations = async (req, res) => {
  try {
    const userId = req.user._id;

    // 1. Get watch history 
    const history = await WatchHistory.find({ user: userId })
      .sort({ watchedAt: -1 })
      .limit(10)
      .populate({
        path: "video",
        select: "title category"
      });

    const userLikes = history
      .filter(h =>
        h.video &&
        h.video.title &&
        h.video.category === "movie"
      )
      .map(h => h.video.title);

    // 3. Cold start 
    if (userLikes.length === 0) {
      const trending = await Video.find({ category: "movie" })
        .sort({ views: -1 })
        .limit(4)
        .select("title thumbnailUrl");

      return res.json(trending);
    }

    // 4. Get recommendations from Python service
    // const response = await axios.post("http://localhost:8000/recommend", {
    //   user_likes: userLikes
    // });
    if (!process.env.RECOMMENDER_URL) {
      const trending = await Video.find({ category: "movie" })
        .sort({ views: -1 })
        .limit(4)
        .select("title thumbnailUrl");

      return res.json(trending);
    }

    const response = await axios.post(
      `${process.env.RECOMMENDER_URL}/recommend`,
      { user_likes: userLikes }
    );


    const recommendedTitles = response.data.recommendations;

    // 5. Fetch full movie data
    const movies = await Video.find({
      title: { $in: recommendedTitles },
      category: "movie" // 🔥 safety
    }).select("title thumbnailUrl");

    // 6. Maintain order (IMPORTANT)
    const moviesMap = new Map(movies.map(m => [m.title, m]));

    const orderedMovies = recommendedTitles
      .map(title => moviesMap.get(title))
      .filter(Boolean)
      .slice(0, 4);

    return res.json(orderedMovies);

  } catch (error) {
    return res.status(500).json({ error: "Recommendation failed" });
  }
};