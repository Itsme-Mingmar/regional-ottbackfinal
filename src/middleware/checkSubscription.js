import apiError from "../utils/apiError.js";

const checkSubscription = (requiredPlan = "premium") => {
  return (req, res, next) => {

    if (requiredPlan === "premium") {
      if (!req.user.subscriptionStatus) {
        return next(new apiError(403, "Premium subscription required"));
      }

      if (new Date() > new Date(req.user.subscriptionEndDate)) {
        return next(new apiError(403, "Subscription expired"));
      }
    }

    next();
  };
};

export default checkSubscription;