import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { userRouter } from "./routes/userRoutes.js";
import { videoRouter } from "./routes/videoRoutes.js";
import { watchRouter } from "./routes/watchHistoryRoutes.js";
import { paymentRoutes } from "./routes/paymentRoutes.js"; 
import { recommenderRouter } from "./routes/recommenderRouters.js";

const app = express();

app.use(express.json());
const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.log("Blocked by CORS:", origin);
    return callback(null, false);
  },
  credentials: true,
}));
app.use(cookieParser());
app.use("/api/user",userRouter);
app.use("/api/video", videoRouter);
app.use("/api/watch", watchRouter);
app.use("/api/payment", paymentRoutes);
app.use("/api", recommenderRouter);

app.get("/", (req, res) => {
  res.send("API is running...");
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong" });
});

export default app;