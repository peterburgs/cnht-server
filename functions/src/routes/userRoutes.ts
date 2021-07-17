import express, { Router, Request, Response, NextFunction } from "express";
import { log } from "../utils";
import { ROLES, User } from "../types";
import requireAuth from "../middleware/requireAuth";
import requireRole from "../middleware/requireRole";
import db from "../database/firestoreConnection";
import moment from "moment";
const router: Router = express.Router();

router.use(requireAuth);

// GET method: get all users
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  requireRole(
    [ROLES.ADMIN, ROLES.LEARNER],
    req,
    res,
    next,
    async (req, res, next) => {
      try {
        const snapshot = await db
          .collection("users")
          .where("isHidden", "==", false)
          .get();
        console.log(snapshot);
        if (snapshot.docs[0].exists) {
          const users = snapshot.docs.map((doc) => doc.data());
          res.status(200).json({
            message: log("User found"),
            count: users.length,
            users: users,
          });
        } else {
          res.status(404).json({
            message: log("No users found"),
            count: 0,
            users: [],
          });
        }
      } catch (error) {
        console.log(error.message);
        res.status(500).json({
          message: log("No users found"),
          count: 0,
          users: [],
        });
      }
    }
  );
});

// PUT method: update user by id
router.put("/:id", async (req: Request, res: Response, next: NextFunction) => {
  requireRole(
    [ROLES.ADMIN, ROLES.LEARNER],
    req,
    res,
    next,
    async (req, res, next) => {
      try {
        const id = req.params.id;
        const snapshot = await db
          .collection("users")
          .where("id", "==", id)
          .get();
        const updatedAt = moment(new Date()).format("YYYY/MM/DD HH:mm:ss");
        if (snapshot.docs[0].exists) {
          await db.collection("users").doc(`${id}`).update({
            balance: req.body.balance,
            updatedAt: updatedAt,
          });
          let userToUpdate = snapshot.docs[0].data();
          userToUpdate.balance = req.body.balance;
          userToUpdate.updatedAt = updatedAt;
          res.status(200).json({
            message: log("Update user successfully"),
            count: 1,
            user: userToUpdate,
          });
        } else {
          res.status(404).json({
            message: log("User not found"),
            count: 0,
            user: null,
          });
        }
      } catch (error) {
        log(error.message);
        res.status(500).json({
          message: log(error.message),
          count: 0,
          user: null,
        });
      }
    }
  );
});

export default router;
