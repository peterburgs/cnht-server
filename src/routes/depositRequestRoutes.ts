import express, { Router, Request, Response, NextFunction } from "express";
import { log } from "../utils";
import { ROLES, STATUSES } from "../types";
import { Op, Model } from "sequelize";
import requireAuth from "../middleware/requireAuth";
import requireRole from "../middleware/requireRole";
import DepositRequest from "../models/depositRequest";
// Define router
const router: Router = express.Router();

// POST method: create new deposit request
router.post(
  "/",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    requireRole([ROLES.LEARNER], req, res, next, async (req, res, next) => {
      try {
        const depositRequest = await DepositRequest.create({
          learnerId: req.body.learnerId,
          amount: req.body.amount,
          imageUrl: req.body.imageUrl,
          depositRequestStatus: req.body.depositRequestStatus,
        });
        if (depositRequest) {
          await depositRequest.reload();
          res.status(201).json({
            message: log("Create new deposit request successfully"),
            count: 1,
            depositRequest: depositRequest,
          });
        } else {
          res.status(500).json({
            message: log("Cannot create deposit request"),
            count: 0,
            depositRequest: null,
          });
        }
      } catch (error) {
        log(error.message);
        res.status(500).json({
          message: log(error.message),
          count: 0,
          depositRequest: null,
        });
      }
    });
  }
);

// GET method: get depositRequests by filters
router.get(
  "/",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
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

          // Find course from filter
          const depositRequests = await DepositRequest.findAll({
            where: {
              [Op.and]: reqParams,
            },
          });
          if (depositRequests.length) {
            res.status(200).json({
              message: log("Deposit requests found"),
              count: depositRequests.length,
              depositRequests: depositRequests,
            });
          } else {
            res.status(404).json({
              message: log("No deposit requests found"),
              count: 0,
              depositRequests: [],
            });
          }
        } catch (error) {
          console.log(error.message);
          res.status(500).json({
            message: log("No deposit requests found"),
            count: 0,
            depositRequests: [],
          });
        }
      }
    );
  }
);
// PUT method: update a deposit request by PK

router.put(
  "/:id",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    requireRole([ROLES.ADMIN], req, res, next, async (req, res, next) => {
      try {
        // Find course by id
        let depositRequest = await DepositRequest.findByPk(req.params.id);
        if (depositRequest) {
          // Update
          depositRequest.learnerId = req.body.learnerId;
          depositRequest.amount = req.body.amount;
          depositRequest.imageUrl = req.body.imageUrl;
          depositRequest.depositRequestStatus = req.body.depositRequestStatus;
          // Save
          await depositRequest.save();
          // Refresh from database
          await depositRequest.reload();
          res.status(200).json({
            message: log("Update deposit request successfully"),
            count: 1,
            depositRequest: depositRequest,
          });
        } else {
          res.status(404).json({
            message: log("Deposit request not found"),
            count: 0,
            depositRequest: null,
          });
        }
      } catch (error) {
        log(error.message);
        res.status(500).json({
          message: log(error.message),
          count: 0,
          depositRequest: null,
        });
      }
    });
  }
);

export default router;
