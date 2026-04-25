  import User from '../models/User.js';
  import Province from '../models/Province.js';
  import apiError from '../utils/apiError.js';
  import apiResponse from "../utils/apiResponse.js"
  import asyncHandler from '../utils/asyncHandler.js'
  import accesstoken from '../utils/token.js'

  const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, password, province, plan, billing } = req.body;

    if (!fullName || !email || !password || !province) {
      throw new apiError(400, "All fields are required");
    }

    if (password.length < 6) {
      throw new apiError(400, "Password must be at least 6 characters");
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw new apiError(400, "User already exists with this email");
    }

    const provinceExists = await Province.findOne({ slug: province });

    if (!provinceExists) {
      throw new apiError(404, "Selected province not found");
    }

    /* Subscription Logic */

    let planType = "standard";
    let billingCycle = "monthly";
    let subscriptionStatus = false;
    let subscriptionStartDate = null;
    let subscriptionEndDate = null;

    const validPlans = ["standard", "premium"];
    const validBilling = ["monthly", "yearly"];

    if (validPlans.includes(plan)) {
      planType = plan;
    }

    if (validBilling.includes(billing)) {
      billingCycle = billing;
    }

    if (planType === "premium") {
      subscriptionStatus = true;

      const startDate = new Date();
      let endDate = new Date(startDate);

      if (billingCycle === "monthly") {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      subscriptionStartDate = startDate;
      subscriptionEndDate = endDate;
    }

    const user = await User.create({
      name: fullName,
      email: normalizedEmail,
      password,
      selectedProvince: provinceExists._id,
      planType,
      billingCycle,
      subscriptionStatus,
      subscriptionStartDate,
      subscriptionEndDate,
    });
    const populatedUser = await User.findById(user._id).populate("selectedProvince");

    const safeUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      selectedProvince: {
        id: populatedUser.selectedProvince._id,
        name: populatedUser.selectedProvince.name,
        slug: populatedUser.selectedProvince.slug
      },
      planType: user.planType,
      billingCycle: user.billingCycle,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionStartDate: user.subscriptionStartDate,
      subscriptionEndDate: user.subscriptionEndDate,
      createdAt: user.createdAt,
    };
    const accessToken = accesstoken({
      id: user._id,
      email: user.email,
      province: user.selectedProvince.slug,
    });

    const options = {
      httpOnly: true,
      secure: true,
      sameSite: "none"
    };

    return res
      .status(201)
      .cookie("accessToken", accessToken, options)
      .json(new apiResponse(201, { ...safeUser, token: accessToken }, "User registered successfully"));
  });

  const updateUserPlan = asyncHandler(async (req, res) => {
    const { planType, billingCycle } = req.body;

    const userId = req.user._id; // Assuming req.user is set by auth middleware

    const user = await User.findById(userId);
    if (!user) {
      throw new apiError(404, "User not found");
    }

    const validPlans = ["standard", "premium"];
    const validBilling = ["monthly", "yearly"];

    if (planType && !validPlans.includes(planType)) {
      throw new apiError(400, "Invalid plan type");
    }

    if (billingCycle && !validBilling.includes(billingCycle)) {
      throw new apiError(400, "Invalid billing cycle");
    }

    // Update fields if provided
    if (planType) {
      user.planType = planType;
    }

    if (billingCycle) {
      user.billingCycle = billingCycle;
    }

    // If changing to premium, activate subscription
    if (planType === "premium" && user.planType !== "premium") {
      user.subscriptionStatus = true;
      const startDate = new Date();
      let endDate = new Date(startDate);
      if (billingCycle === "monthly" || (!billingCycle && user.billingCycle === "monthly")) {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }
      user.subscriptionStartDate = startDate;
      user.subscriptionEndDate = endDate;
    }

    // If changing billing cycle and subscription is active, adjust end date
    if (billingCycle && user.subscriptionStatus) {
      const startDate = user.subscriptionStartDate || new Date();
      let endDate = new Date(startDate);
      if (billingCycle === "monthly") {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }
      user.subscriptionEndDate = endDate;
    }

    await user.save();

    const safeUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      selectedProvince: user.selectedProvince,
      planType: user.planType,
      billingCycle: user.billingCycle,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionStartDate: user.subscriptionStartDate,
      subscriptionEndDate: user.subscriptionEndDate,
    };

    return res
      .status(200)
      .json(new apiResponse(200, safeUser, "User plan updated successfully"));
  });

  // Login and email-check controller helpers

  const checkEmail = asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) {
      throw new apiError(400, "Email is required");
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      // respond with 404 so front‑end can prompt for registration
      throw new apiError(404, "Email not found");
    }

    return res
      .status(200)
      .json(new apiResponse(200, { exists: true }, "Email exists"));
  });

  const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new apiError(400, "Email and password are required");
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail }).populate('selectedProvince', 'name slug');
    if (!user) {
      throw new apiError(404, "User not found");
    }

    const passwordMatch = await user.matchPassword(password);
    if (!passwordMatch) {
      throw new apiError(401, "Invalid credentials");
    }

    const safeUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      selectedProvince: {
        id: user.selectedProvince._id,
        name: user.selectedProvince.name,
        slug: user.selectedProvince.slug
      },
      planType: user.planType,
      billingCycle: user.billingCycle,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionStartDate: user.subscriptionStartDate,
      subscriptionEndDate: user.subscriptionEndDate,
    };

    const accessToken = accesstoken({
      id: user._id,
      email: user.email,
      province: user.selectedProvince.slug,
    });

    const options = {
      httpOnly: true,
      secure: true,
      sameSite: "none"
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .json(new apiResponse(200, { ...safeUser, token: accessToken }, "Login successful"));
  });

  const getUserProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).populate('selectedProvince', 'name');

    if (!user) {
      throw new apiError(404, "User not found");
    }

    const userProfile = {
      name: user.name,
      email: user.email,
      province: user.selectedProvince.name,
      subscriptionStatus: user.subscriptionStatus,
      planType: user.planType,
      role: user.role,
    };

    return res
      .status(200)
      .json(new apiResponse(200, userProfile, "User profile retrieved successfully"));
  });
  const logoutUser = asyncHandler(async (req, res) => {

  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "none"
  };

    return res
      .status(200)
      .clearCookie("accessToken", options)
      .json(new apiResponse(200, {}, "Logged out successfully"));
  });

  const getAllUsers = asyncHandler(async (req, res) => {
    const users = await User.find({}).populate('selectedProvince', 'name slug').select('-password');
    return res
      .status(200)
      .json(new apiResponse(200, users, "Users retrieved successfully"));
  });

  const deleteUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      throw new apiError(404, "User not found");
    }
    return res
      .status(200)
      .json(new apiResponse(200, {}, "User deleted successfully"));
  });

  const updateUserRole = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { role } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      throw new apiError(404, "User not found");
    }
    user.role = role;
    await user.save();
    return res
      .status(200)
      .json(new apiResponse(200, user, "User role updated successfully"));
  });

  export { registerUser, updateUserPlan, checkEmail, loginUser, getUserProfile, logoutUser, getAllUsers, deleteUser, updateUserRole };
