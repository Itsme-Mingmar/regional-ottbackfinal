import PendingUser from "../models/pendingUser.js";
import Province from "../models/Province.js";
import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import apiError from "../utils/apiError.js";
import accesstoken from "../utils/token.js";

const initiateKhalti = asyncHandler(async (req, res) => {
  const { fullName, email, password, province, plan, billing } = req.body;

  if (!fullName || !email || !password || !province || !plan || !billing) {
    throw new apiError(400, "All fields are required");
  }

  if (plan !== "premium") {
    throw new apiError(400, "Khalti only for premium plan");
  }

  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new apiError(400, "User already exists");
  }

  const provinceExists = await Province.findOne({ slug: province });
  if (!provinceExists) {
    throw new apiError(404, "Province not found");
  }

  const amount = billing === "yearly" ? 600000 : 60000;

  const purchase_order_id = `sub_${Date.now()}`;

  const response = await fetch(
    "https://dev.khalti.com/api/v2/epayment/initiate/",
    {
      method: "POST",
      headers: {
        Authorization: `Key ${process.env.KHALTI_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        return_url: `${process.env.FRONTEND_URL}/payment-success`,
        website_url: process.env.FRONTEND_URL,
        amount,
        purchase_order_id,
        purchase_order_name: "Premium Subscription",
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new apiError(400, data.detail || "Khalti initiate failed");
  }

  await PendingUser.create({
    fullName,
    email: normalizedEmail,
    password,
    province,
    plan,
    billing,
    amount,
    pidx: data.pidx,
  });

  res.json({
    success: true,
    payment_url: data.payment_url,
  });
});

const verifyKhalti = asyncHandler(async (req, res) => {
  const { pidx } = req.body;

  if (!pidx) {
    throw new apiError(400, "pidx is required");
  }

  // Verify payment
  const response = await fetch(
    "https://dev.khalti.com/api/v2/epayment/lookup/",
    {
      method: "POST",
      headers: {
        Authorization: `Key ${process.env.KHALTI_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pidx }),
    }
  );

  const data = await response.json();

  if (data.status !== "Completed") {
    throw new apiError(400, "Payment not completed");
  }

  const pending = await PendingUser.findOne({ pidx });

  if (!pending) {
    throw new apiError(404, "Pending user not found");
  }

  if (pending.isProcessed) {
    const existingUser = await User.findOne({ email: pending.email });

    return res.json({
      success: true,
      message: "Already processed",
      user: existingUser,
    });
  }

  const provinceDoc = await Province.findOne({ slug: pending.province });

  if (!provinceDoc) {
    throw new apiError(404, "Province not found");
  }

  let user = await User.findOne({ email: pending.email });

  if (!user) {
    const startDate = new Date();
    let endDate = new Date(startDate);

    if (pending.billing === "monthly") {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    user = await User.create({
      name: pending.fullName,
      email: pending.email,
      password: pending.password,
      selectedProvince: provinceDoc._id,
      planType: "premium",
      billingCycle: pending.billing,
      subscriptionStatus: true,
      subscriptionStartDate: startDate,
      subscriptionEndDate: endDate,
    });
  }

  pending.isProcessed = true;
  await pending.save();

  const safeUser = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    selectedProvince: {
      id: provinceDoc._id,
      name: provinceDoc.name,
      slug: provinceDoc.slug
    },
    planType: user.planType,
    billingCycle: user.billingCycle,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionStartDate: user.subscriptionStartDate,
    subscriptionEndDate: user.subscriptionEndDate,
  };

  const token = accesstoken({
    id: user._id,
    email: user.email,
    province: provinceDoc.slug,
  });

  const isProduction = process.env.NODE_ENV === "production";

  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
  };

  return res
    .cookie("accessToken", token, cookieOptions)
    .json({
      success: true,
      message: "Payment success",
      user: safeUser,
    });
});

export { initiateKhalti, verifyKhalti };