import { Router } from "express";
import {
  registerUser,
  updateUserPlan,
  checkEmail,
  loginUser,
  getUserProfile,
  logoutUser,
  getAllUsers,
  deleteUser,
  updateUserRole,
} from "../controllers/user.controller.js";
import verifyJWT from "../middleware/verifyJwt.middleware.js";
import roleVerify from "../middleware/role.middleware.js";

const userRouter = Router();

userRouter.post("/registerUser", registerUser);
userRouter.post("/checkEmail", checkEmail);
userRouter.post("/login", loginUser);
userRouter.post("/logout", verifyJWT, logoutUser);
userRouter.put("/updatePlan", verifyJWT, updateUserPlan);
userRouter.get("/profile", verifyJWT, getUserProfile);
userRouter.get("/all", verifyJWT, roleVerify, getAllUsers);
userRouter.delete("/:userId", verifyJWT, roleVerify, deleteUser);
userRouter.put("/:userId/role", verifyJWT, roleVerify, updateUserRole);

export { userRouter };