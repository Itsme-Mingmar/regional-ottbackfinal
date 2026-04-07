import { Router } from "express";
import verifyJWT from "../middleware/verifyJwt.middleware.js";
import { getRecommendations } from "../controllers/recommender.controller.js";

const recommenderRouter = Router();

recommenderRouter.get("/recommend", verifyJWT, getRecommendations);

export { recommenderRouter };