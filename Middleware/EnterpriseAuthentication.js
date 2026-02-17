import jwt from "jsonwebtoken";
import UserModel from "../Models/User.js";

const isEnterprise = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const accessTokenSecret = process.env["JWT_SECRET_KEY"];
  if (!authHeader) return res.sendStatus(401);
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, accessTokenSecret);
    const userData = await UserModel.findById(decoded.id);
    if (!userData) return res.sendStatus(401);
    if (userData.usertype !== 2)
      return res
        .status(403)
        .json({ success: false, message: "Enterprise access required" });
    // preserve existing req.user usage
    req.user = userData;
    req.enterprise = userData;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Token verification failed",
      error: err.message,
    });
  }
};

export default isEnterprise;
