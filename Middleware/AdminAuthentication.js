import jwt from "jsonwebtoken";
import AdminModel from "../Models/Admin.js";
import AdminTokenModel from "../Models/AdminToken.js";
import { view, baseUrl, assetsUrl } from "../Config.js";
import UserModel from "../Models/User.js";

const isAdmin = async (req, res, next) => {
  const accessTokenSecret = process.env["JWT_SECRET_KEY"];

  // Prefer session token, then cookie, then authorization header
  const token =
    (req.session && req.session.token) ||
    (req.cookies && req.cookies.token) ||
    (req.headers &&
      req.headers.authorization &&
      req.headers.authorization.split(" ")[1]);

  if (!token) {
    return res.redirect(baseUrl + "admin/signin");
  }

  jwt.verify(token, accessTokenSecret, async (err, decoded) => {
    if (err) {
      // remove bad token from database if present
      try {
        await AdminTokenModel.deleteOne({ token: token });
      } catch (e) {
        console.error("Error deleting admin token", e);
      }
      return res.sendStatus(401);
    }

    try {
      // Check that token exists in DB and belongs to the same user
      const tokenData = await AdminTokenModel.findOne({ token });
      if (!tokenData) {
        return res.redirect(baseUrl + "admin/signin");
      }

      // Ensure user & token match
      const tokenOwner = await AdminTokenModel.findOne({
        User: decoded.id,
        token,
      });
      if (!tokenOwner) {
        return res.redirect(baseUrl + "admin/signin");
      }

      req.user = await AdminModel.findById(decoded.id);
      req.isLogin = true;
      next();
    } catch (e) {
      console.error("Admin auth error:", e);
      return res.sendStatus(500);
    }
  });
};

export { isAdmin };
