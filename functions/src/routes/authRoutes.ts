import express, { Router, Request, Response, NextFunction } from "express";
import { log, momentFormat } from "../utils";
import requireAuth from "../middleware/requireAuth";
import db from "../database/firestoreConnection";
import { v4 as uuidv4 } from "uuid";
import { ROLES } from "../types";

// Define route
const router: Router = express.Router();
router.use(requireAuth);

// POST method: Sign in && create new user if not existed
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const createdAt = momentFormat();
    const updatedAt = momentFormat();
    const snapshot = await db
      .collection("users")
      .where("isHidden", "==", false)
      .where("email", "==", req.body.decodedUser.email)
      .get();

    // If user not found, create new
    if (!snapshot.docs[0]) {
      try {
        const id = uuidv4();
        const newUser = await db.collection("users").doc(id).set({
          id: id,
          email: req.body.decodedUser.email,
          fullName: req.body.decodedUser.name,
          avatarUrl: req.body.decodedUser.picture,
          userRole: ROLES.LEARNER,
          balance: 0,
          isHidden: false,
          createdAt: createdAt,
          updatedAt: updatedAt,
        });
        if (newUser) {
          return res.status(201).json({
            message: "Create new user successfully",
            count: 1,
            user: {
              id: id,
              email: req.body.decodedUser.email,
              fullName: req.body.decodedUser.name,
              avatarUrl: req.body.decodedUser.picture,
              userRole: ROLES.LEARNER,
              balance: 0,
              isHidden: false,
            },
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
        return res.status(500).json({
          message: error.message,
          user: null,
          count: 0,
        });
      }
    }
    // If user existed, then sign in
    if (req.query.userRole) {
      let user = snapshot.docs[0].data();
      if (user.userRole === req.query.userRole) {
        await db.collection("users").doc(user.id).update({
          avatarUrl: req.body.decodedUser.picture,
          fullName: req.body.decodedUser.name,
          updatedAt: updatedAt,
        });
        user.avatarUrl = req.body.decodedUser.picture;
        user.fullName = req.body.decodedUser.name;
        return res.status(200).json({
          user: user,
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
    res.status(500).json({
      message: log(error.message),
    });
  }
});

export default router;
