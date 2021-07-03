import express, { Router, Request, Response, NextFunction } from "express";
import { log } from "../utils";
import { ROLES } from "../types";
import { Op, Model } from "sequelize";
import requireAuth from "../middleware/requireAuth";
import requireRole from "../middleware/requireRole";

// TODO: implement image upload using multer

// Define router
const router: Router = express.Router();

// Models
import User from "../models/user";
router.use(requireAuth);

// GET method: get users by filters
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  requireRole(
    [ROLES.ADMIN, ROLES.LEARNER],
    req,
    res,
    next,
    async (req, res, next) => {
      try {
        // Create filter from request query
        let reqParams: { [key: string]: string }[] = [];
        for (let [key, value] of Object.entries(req.query)) {
          reqParams.push({ [key]: String(value) });
        }
        // Find user from filter
        const users = await User.findAll({
          where: {
            isHidden: false,
            [Op.and]: reqParams,
          },
        });
        if (users.length) {
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
        // Find user by id
        let user = await User.findByPk(req.params.id);
        if (user) {
          // Update
          user.email = req.body.email;
          user.userRole = req.body.userRole;
          user.balance = req.body.balance;

          // Save
          await user.save();
          // Refresh from database
          await user.reload();
          res.status(200).json({
            message: log("Update user successfully"),
            count: 1,
            user,
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

// DELETE method:

export default router;
