import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Branch from "../models/Branch.js";
import Employee from "../models/Employee.js";

export const authMiddleware = async (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ msg: "No token, authorization denied" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      id: decoded.id,
      email: decoded.email || null,
      name: decoded.name || null,
      role: decoded.role || null,
      branch: decoded.branch || null,
      clientIdNumber: decoded.clientIdNumber || null,
    };

    if (!req.user.email || !req.user.name) {
      let foundUser = await User.findById(decoded.id).select("email name role branch");
      if (!foundUser) {
        foundUser = await Employee.findById(decoded.id).select("employeeData.personalData.email employeeData.personalData.name employeeData.basicInformation.branch");
      }
      if (!foundUser) {
        foundUser = await Branch.findById(decoded.id).select("branchData.email branchData.name branchData.branch");
      }

      if (foundUser) {
        req.user.email =
          foundUser.email ||
          foundUser.branchData?.email ||
          foundUser.employeeData?.personalData?.email ||
          req.user.email;

        req.user.name =
          foundUser.name ||
          foundUser.branchData?.name ||
          foundUser.employeeData?.personalData?.name ||
          req.user.name;

        req.user.branch =
          foundUser.branch ||
          foundUser.branchData?.branch ||
          foundUser.employeeData?.basicInformation?.branch ||
          req.user.branch;

        req.user.role = req.user.role || foundUser.role || "client";
      }
    }

    if (!req.user.email) {
      return res.status(401).json({ msg: "User email missing in token or database" });
    }

    next();
  } catch (err) {
    console.error("❌ JWT verification failed:", err.message);
    res.status(401).json({ msg: "Token is not valid" });
  }
};

export const roleMiddleware = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ msg: "Access denied" });
    }
    next();
  };
};
