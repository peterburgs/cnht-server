import { ROLES } from "../types";
import User from "../models/user";
import { Request, Response, NextFunction } from "express";
import { log } from "../utils";

const requireRole = async (
  routeRoles: ROLES[],
  req: Request,
  res: Response,
  next: NextFunction,
  cb: (req: Request, res: Response, next: NextFunction) => void
) => {
  try {
    const user = await User.findOne({
      where: { email: req.body.decodedUser.email },
    });
    if (user) {
      if (!routeRoles.includes(user.userRole)) {
        console.log("Permission denied");
        return res.status(401).json({
          message: log("Permission denied"),
        });
      }
      cb(req, res, next);
    } else {
      res.status(404).json({
        message: log("User not found"),
      });
    }
  } catch (error) {
    res.status(500).json({
      message: log(error.message),
    });
  }
};
export default requireRole;
