import OperatorModel from "../Models/Operator.js";
import jwt from "jsonwebtoken";

const isOperator = async (req, res, next) => {
  try {
    const token =
      req.headers.authorization?.split(" ")[1] || req.headers["x-access-token"];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const operator = await OperatorModel.findById(decoded.id);

    if (!operator) {
      return res.status(404).json({
        success: false,
        message: "Operator not found",
      });
    }

    if (!operator.isActive) {
      return res.status(403).json({
        success: false,
        message: "Operator account is inactive",
      });
    }

    if (operator.token !== token) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    req.operator = operator;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Token verification failed",
      error: error.message,
    });
  }
};

export default isOperator;
