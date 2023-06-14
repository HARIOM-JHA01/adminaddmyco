import jwt from "jsonwebtoken";
import MasterAdminModel from "../Models/MasterAdmin.js";
import MasterAdminTokenModel from "../Models/MasterAdminToken.js";
// import SuperAdminModel from "../Models/SuperAdmin.js";
// import SuperAdminTokenModel from "../Models/SuperAdminToken.js";
// import { view, baseUrl, assetsUrl } from "../Config.js";
// import "dotenv/config"

const isMasterAdmin = async (req, res, next) => {
  try {
    let authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(" ")[1]
      jwt.verify(token, process.env.JWT_SECRET_KEY, async (err, user) => {
        if (err) {
          await MasterAdminTokenModel.findOne({ token: token }).deleteOne();
          return res.status(401).json({
            success: true,
            message: "Unauthorized User"
          })
        }
        let tokenData = await MasterAdminTokenModel.findOne({ token: token });
        if (!tokenData) {
          return res.redirect("signin");
        }
        var userData = await MasterAdminModel.findById(user.id);
        // console.log("userData",userData);
        if (!tokenData) {
          return res.redirect("signin");
        }
        req.user = userData
        next();
      });
    } else {
      return res.status(401).json({
        success: true,
        message: "Unauthorized User"
      })
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error: error,
      message: "Something Went Wrong..."
    });
  }

};
export { isMasterAdmin };


