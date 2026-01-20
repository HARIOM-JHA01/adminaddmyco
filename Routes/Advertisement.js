import express from "express";
import AdvertisementController from "../Controllers/AdvertisementController.js";
import { isUser } from "../Middleware/UserAuthentication.js";
import { isAdmin } from "../Middleware/AdminAuthentication.js";

const advertisement = express.Router();

// ======================== USER ENDPOINTS ========================

// Get all active packages
advertisement.get(
  "/api/v1/advertisement/packages",
  AdvertisementController.getPackages,
);

// Get user's credit balance
advertisement.get(
  "/api/v1/advertisement/my-credits",
  isUser,
  AdvertisementController.getMyCredits,
);

// Buy credits (initiate payment)
advertisement.post(
  "/api/v1/advertisement/buy-credits",
  isUser,
  AdvertisementController.buyCredits,
);

// Get payment history
advertisement.get(
  "/api/v1/advertisement/payment-history",
  isUser,
  AdvertisementController.getPaymentHistory,
);

// Verify payment and add credits
advertisement.post(
  "/api/v1/advertisement/verify-payment",
  isUser,
  AdvertisementController.verifyPayment,
);

// Create new advertisement
advertisement.post(
  "/api/v1/advertisement/create",
  isUser,
  AdvertisementController.createAdvertisement,
);

// Get user's advertisements
advertisement.get(
  "/api/v1/advertisement/my-ads",
  isUser,
  AdvertisementController.getMyAds,
);

// Get user's advertisement statistics (credits and displays)
advertisement.get(
  "/api/v1/advertisement/my-stats",
  isUser,
  AdvertisementController.getMyStats,
);

// Get detailed statistics for a specific advertisement (views by country, date, time)
advertisement.get(
  "/api/v1/advertisement/:id/stats",
  isUser,
  AdvertisementController.getAdStats,
);

// Pause advertisement
advertisement.patch(
  "/api/v1/advertisement/:id/pause",
  isUser,
  AdvertisementController.pauseAd,
);

// Resume advertisement
advertisement.patch(
  "/api/v1/advertisement/:id/resume",
  isUser,
  AdvertisementController.resumeAd,
);

// Delete advertisement
advertisement.delete(
  "/api/v1/advertisement/:id",
  isUser,
  AdvertisementController.deleteAd,
);

// ======================== PUBLIC ENDPOINTS (NO AUTH) ========================

// Get active ads for display
advertisement.get(
  "/api/v1/advertisement/active",
  AdvertisementController.getActiveAds,
);

// Get current advertisement country filter config (0 = disabled, 1 = enabled)
advertisement.get(
  "/api/v1/advertisement/config/ad-country-filter",
  AdvertisementController.getAdCountryFilterConfig,
);

// Country-level advertisement configs removed; use Admin -> Configuration to set ConfigKey = ADVERTISEMENTS_COUNTRY_FILTER (value 0 or 1).

// Track display/impression
advertisement.post(
  "/api/v1/advertisement/:id/track-display",
  AdvertisementController.trackDisplay,
);

// Track click
advertisement.post(
  "/api/v1/advertisement/:id/track-click",
  AdvertisementController.trackClick,
);

// ======================== ADMIN ENDPOINTS ========================

// Get all packages
advertisement.get(
  "/api/v1/admin/advertisement/packages",
  isAdmin,
  AdvertisementController.adminGetPackages,
);

// Get single package
advertisement.get(
  "/api/v1/admin/advertisement/packages/:id",
  isAdmin,
  AdvertisementController.adminGetPackage,
);

// Create package
advertisement.post(
  "/api/v1/admin/advertisement/packages",
  isAdmin,
  AdvertisementController.adminCreatePackage,
);

// Update package
advertisement.patch(
  "/api/v1/admin/advertisement/packages/:id",
  isAdmin,
  AdvertisementController.adminUpdatePackage,
);

// Toggle package active status
advertisement.patch(
  "/api/v1/admin/advertisement/packages/:id/toggle",
  isAdmin,
  AdvertisementController.adminTogglePackage,
);

// Delete package
advertisement.delete(
  "/api/v1/admin/advertisement/packages/:id",
  isAdmin,
  AdvertisementController.adminDeletePackage,
);

// Get all advertisements
advertisement.get(
  "/api/v1/admin/advertisement/all",
  isAdmin,
  AdvertisementController.adminGetAllAds,
);

// Approve advertisement
advertisement.patch(
  "/api/v1/admin/advertisement/:id/approve",
  isAdmin,
  AdvertisementController.adminApproveAd,
);

// Reject advertisement
advertisement.patch(
  "/api/v1/admin/advertisement/:id/reject",
  isAdmin,
  AdvertisementController.adminRejectAd,
);

// Get analytics
advertisement.get(
  "/api/v1/admin/advertisement/analytics",
  isAdmin,
  AdvertisementController.adminGetAnalytics,
);

// Get sponsor details
advertisement.get(
  "/api/v1/admin/sponsor/:sponsorId/details",
  isAdmin,
  AdvertisementController.adminGetSponsorDetails,
);

// Get credit payment requests
advertisement.get(
  "/api/v1/admin/advertisement/credit-payments",
  isAdmin,
  AdvertisementController.adminGetCreditPayments,
);

// Approve credit payment
advertisement.patch(
  "/api/v1/admin/advertisement/credit-payments/:id/approve",
  isAdmin,
  AdvertisementController.adminApproveCreditPayment,
);

// Reject credit payment
advertisement.patch(
  "/api/v1/admin/advertisement/credit-payments/:id/reject",
  isAdmin,
  AdvertisementController.adminRejectCreditPayment,
);

// ======================== COUPON RATES ENDPOINTS (ADMIN) ========================

// Get all coupon rates
advertisement.get(
  "/api/v1/admin/advertisement/rates",
  isAdmin,
  AdvertisementController.adminGetRates,
);

// Get specific coupon rate
advertisement.get(
  "/api/v1/admin/advertisement/rates/:position",
  isAdmin,
  AdvertisementController.adminGetRate,
);

// Update coupon rate
advertisement.patch(
  "/api/v1/admin/advertisement/rates/:position",
  isAdmin,
  AdvertisementController.adminUpdateRate,
);

// ======================== USER ENDPOINTS (PUBLIC) ========================

// Get coupon rates (public - for users to see conversion rates)
advertisement.get(
  "/api/v1/advertisement/rates",
  AdvertisementController.getUserRates,
);

export default advertisement;
