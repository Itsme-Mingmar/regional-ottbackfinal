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
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      "http://localhost:5176",
      process.env.FRONTEND_URL
    ].filter(Boolean);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 200
}));
app.use(cookieParser());
app.use("/api/user",userRouter);
app.use("/api/video", videoRouter);
app.use("/api/watch", watchRouter);
app.use("/api/payment", paymentRoutes);
app.use("/api", recommenderRouter);
export default app;