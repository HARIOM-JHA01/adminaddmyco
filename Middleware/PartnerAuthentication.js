import jwt from "jsonwebtoken";
import PartnerModel from "../Models/Partner.js";

const isPartner = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const accessTokenSecret = process.env["JWT_SECRET_KEY"];

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: "Authorization header missing",
    });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Token missing",
    });
  }

  try {
    const decoded = await new Promise((resolve, reject) => {
      jwt.verify(token, accessTokenSecret, (err, decoded) => {
        if (err) reject(err);
        else resolve(decoded);
      });
    });

    // Find partner with this token
    const partner = await PartnerModel.findOne({
      _id: decoded.id,
      token: token,
      status: 1,
    });

    if (!partner) {
      return res.status(401).json({
        success: false,
        message: "Invalid token or partner not found",
      });
    }

    // Update last active
    partner.lastActive = new Date();
    await partner.save();

    req.partner = partner;
    req.isPartnerLoggedIn = true;
    next();
  } catch (err) {
    console.error("Partner authentication error:", err);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

export { isPartner };
