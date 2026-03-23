import mongoose from "mongoose";

const pendingUserSchema = new mongoose.Schema({
  fullName: String,
  email: String,
  password: String,
  province: String,

  plan: String,
  billing: String,

  amount: Number,
  pidx: String,

  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 30 // auto delete after 30 min
  }
});

const PendingUser = mongoose.model("PendingUser", pendingUserSchema);
export default PendingUser; 