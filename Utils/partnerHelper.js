import PartnerModel from "../Models/Partner.js";
import PartnerUserModel from "../Models/PartnerUser.js";
import moment from "moment";

/**
 * Handle partner referral when a user signs up
 * @param {string} referralCode - Partner's referral code
 * @param {Object} user - User object that just signed up
 * @returns {Object} - Result object with success status and message
 */
export const handlePartnerReferral = async (referralCode, user) => {
  try {
    if (!referralCode) {
      return { success: false, message: "No referral code provided" };
    }

    // Find partner by referral code
    const partner = await PartnerModel.findOne({
      referralCode: referralCode.toUpperCase(),
      status: 1,
    });

    if (!partner) {
      return { success: false, message: "Invalid referral code" };
    }

    // Check if partner has available credits
    const availableCredits = partner.userCredits - partner.usedUserCredits;

    if (availableCredits <= 0) {
      return {
        success: false,
        message: "Partner has no available credits. Referral link is inactive.",
      };
    }

    // Check if this user already linked to any partner
    const existingLink = await PartnerUserModel.findOne({ user: user._id });

    if (existingLink) {
      return {
        success: false,
        message: "User already linked to a partner",
      };
    }

    // Calculate membership expiry date (1 year from now as default for partner users)
    const membershipExpiryDate = moment().add(1, "year").toDate();

    // Create partner-user relationship
    await PartnerUserModel.create({
      partner: partner._id,
      user: user._id,
      joinDate: new Date(),
      membershipExpiryDate,
      renewalCount: 0,
      status: 1,
    });

    // Deduct one credit from partner
    partner.usedUserCredits += 1;

    // Activate referral link if it wasn't active
    if (!partner.isReferralActive && availableCredits > 0) {
      partner.isReferralActive = true;
    }

    // Deactivate referral if all credits used
    if (partner.userCredits - partner.usedUserCredits <= 0) {
      partner.isReferralActive = false;
    }

    await partner.save();

    return {
      success: true,
      message: "User successfully linked to partner",
      data: {
        partnerId: partner._id,
        partnerName: partner.name,
        remainingCredits: partner.userCredits - partner.usedUserCredits,
        membershipExpiryDate,
      },
    };
  } catch (error) {
    console.error("Handle partner referral error:", error);
    return {
      success: false,
      message: "Error processing referral",
      error: error.message,
    };
  }
};

/**
 * Check if referral code is valid and has credits
 * @param {string} referralCode - Partner's referral code
 * @returns {Object} - Validation result
 */
export const validateReferralCode = async (referralCode) => {
  try {
    if (!referralCode) {
      return { valid: false, message: "No referral code provided" };
    }

    const partner = await PartnerModel.findOne({
      referralCode: referralCode.toUpperCase(),
      status: 1,
    });

    if (!partner) {
      return { valid: false, message: "Invalid referral code" };
    }

    const availableCredits = partner.userCredits - partner.usedUserCredits;

    if (availableCredits <= 0) {
      return {
        valid: false,
        message: "This referral link is no longer active",
      };
    }

    return {
      valid: true,
      message: "Valid referral code",
      data: {
        partnerName: partner.name,
        availableCredits,
      },
    };
  } catch (error) {
    console.error("Validate referral code error:", error);
    return {
      valid: false,
      message: "Error validating referral code",
    };
  }
};

/**
 * Get partner statistics
 * @param {string} partnerId - Partner ID
 * @returns {Object} - Partner statistics
 */
export const getPartnerStats = async (partnerId) => {
  try {
    const partner = await PartnerModel.findById(partnerId);

    if (!partner) {
      throw new Error("Partner not found");
    }

    const totalUsers = await PartnerUserModel.countDocuments({
      partner: partnerId,
    });

    const activeUsers = await PartnerUserModel.countDocuments({
      partner: partnerId,
      membershipExpiryDate: { $gte: new Date() },
    });

    return {
      userCredits: partner.userCredits,
      usedUserCredits: partner.usedUserCredits,
      availableUserCredits: partner.userCredits - partner.usedUserCredits,
      renewalCredits: partner.renewalCredits,
      usedRenewalCredits: partner.usedRenewalCredits,
      availableRenewalCredits:
        partner.renewalCredits - partner.usedRenewalCredits,
      totalUsers,
      activeUsers,
      isReferralActive: partner.isReferralActive,
    };
  } catch (error) {
    console.error("Get partner stats error:", error);
    throw error;
  }
};

export default {
  handlePartnerReferral,
  validateReferralCode,
  getPartnerStats,
};
