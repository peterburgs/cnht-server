import express, { Router, Request, Response, NextFunction } from "express";
import { log } from "../utils";
import requireAuth from "../middleware/requireAuth";
import User from "../models/user";

// Define route
const router: Router = express.Router();
router.use(requireAuth);

// POST method: Sign in && create new user if not existed
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    let user = await User.findOne({
      where: {
        email: req.body.decodedUser.email,
      },
    });

    // If user not found
    if (!user) {
      log(`User ${req.body.email} not found. New user will be created now`);
      // Create new user
      try {
        const newUser = await User.create({
          email: req.body.decodedUser.email,
          fullName: req.body.decodedUser.name,
          avatarUrl: req.body.decodedUser.picture,
        });
        if (newUser) {
          await newUser.reload();
          return res.status(201).json({
            message: "Create new user successfully",
            count: 1,
            user: newUser,
            token: req.headers.authorization,
          });
        } else {
          return res.status(500).json({
            message: "Cannot create new user",
            user: null,
            count: 0,
          });
        }
      } catch (error) {
        console.log(error.message);
        return res.status(500).json({
          message: error.message,
          user: null,
          count: 0,
        });
      }
    }
    // If user existed, then sign in
    if (req.query.userRole) {
      if (user.userRole === req.query.userRole) {
        // update avatar url & fullName
        user.avatarUrl = req.body.decodedUser.picture;
        user.fullName = req.body.decodedUser.name;
        await user.save();
        return res.status(200).json({
          user,
          token: req.headers.authorization,
        });
      } else {
        res.status(500).json({
          message: log("Role of user is not allowed"),
          user: null,
          token: null,
        });
      }
    } else {
      return res.status(403).json({
        message: log(`User role is missing in request query`),
      });
    }
  } catch (error) {
    log(error.message);
    res.status(500).json({
      message: log(error.message),
    });
  }
});

export default router;
