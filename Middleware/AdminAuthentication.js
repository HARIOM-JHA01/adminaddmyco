import jwt from "jsonwebtoken";
import AdminModel from "../Models/Admin.js";
import AdminTokenModel from "../Models/AdminToken.js";
import { view, baseUrl, assetsUrl } from "../Config.js";
import localStorage from "localStorage";
import UserModel from "../Models/User.js";


const isAdmin = async (req, res, next) => {
  const accessTokenSecret = process.env["JWT_SECRET_KEY"];
  const token = localStorage.getItem('token');
  if (token || token != undefined) {
    jwt.verify(token, accessTokenSecret, async (err, user) => {
      if (err) {
        await AdminTokenModel.deleteOne({ where: { token: token } });
        return res.sendStatus(401);
      }
      let tokenData = await AdminTokenModel.findOne({ token: token });
      if (!tokenData) {
        return res.redirect("signin");
      }

      if (user) {
        let userData = await AdminTokenModel.findOne({ User: user.id });
        if (!userData) {
          return res.redirect("signin");
        }
        req.user =  await AdminModel.findById(user.id);
        req.isLogin = true;
      }
      next();
    });
  } else {
    return res.redirect("signin");
  }
};


export { isAdmin };



