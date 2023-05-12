// import jwt from "jsonwebtoken";
// import UserModel from "../Models/User.js";
// import UserTokenModel from "../Models/UserToken.js";


// const isUser = async (req, res, next) => {
//   try {
//     const authHeader = req.headers.authorization;
//     const accessTokenSecret = process.env["JWT_SECRET_KEY"];
//     if (authHeader) {
//       const token = authHeader.split(" ")[1];
//       jwt.verify(token, accessTokenSecret, async (err, user) => {
//         if (err) {
//           await UserTokenModel.deleteOne({ where: { token: token } });
//           return res.sendStatus(401);
//         }
//         let tokenData = await UserTokenModel.findOne({ token: token });
//         if (!tokenData) {
//           return res.sendStatus(401);
//         }
//         if (user) {
//           let userData = await UserModel.findById(user.id);
//           if (!userData) {
//             return res.sendStatus(401);
//           }
//           req.user = userData
//           req.isLogin = true
//         }
//         next()
//       });
//     } else {
//       res.sendStatus(401);
//     }
//   } catch (error) {
//     console.log(error);
//     return res.status(500).json({
//       success: false,
//       error: error,
//       message: "Something Went Wrong..."
//     });
//   }
// }


import jwt from "jsonwebtoken";
import UserModel from "../Models/User.js";
// import { view, baseUrl, assetsUrl } from "../Config.js";

// import "dotenv/config"
const isUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const accessTokenSecret = process.env["JWT_SECRET_KEY"];
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    jwt.verify(token, accessTokenSecret, async (err, user) => {
      if (err) {
        await UserModel.deleteOne({ where: { token: token } });
        return res.sendStatus(401);
      }
      let tokenData = await UserModel.findOne({ token: token });
      if (!tokenData) {
        return res.sendStatus(401);
      }
      
      if (user) {
        let userData = await UserModel.findById(user.id)
        if (!userData) {
          return res.sendStatus(401);
        }
        req.user = userData
        req.isLogin = true
      }
      next()

    });

  } else {
    res.sendStatus(401);
  }
}
export { isUser }

