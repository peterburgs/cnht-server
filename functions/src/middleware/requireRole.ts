import { ROLES } from "../types";
import { Request, Response, NextFunction } from "express";
import { log } from "../utils";
import db from "../database/firestoreConnection";

const requireRole = async (
  routeRoles: ROLES[],
  req: Request,
  res: Response,
  next: NextFunction,
  cb: (req: Request, res: Response, next: NextFunction) => void
) => {
  try {
    const snapshot = await db
      .collection("users")
      .where("isHidden", "==", false)
      .where("email", "==", req.body.decodedUser.email)
      .get();

    if (snapshot.docs[0]) {
      const user = snapshot.docs[0].data();
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
