import { Router } from "express";
import { initiateKhalti, verifyKhalti } from "../controllers/payment.controller.js";

const paymentRoutes = Router();

paymentRoutes.post("/initiate", initiateKhalti);
paymentRoutes.post("/verify", verifyKhalti);

export{ paymentRoutes };