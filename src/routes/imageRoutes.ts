import express, { Router, Request, Response, NextFunction } from "express";
import { log } from "../utils";
import { ROLES } from "../types";
import { Op, Model } from "sequelize";
import requireAuth from "../middleware/requireAuth";
import requireRole from "../middleware/requireRole";
import AWS from "aws-sdk";
import Enrollment from "../models/enrollment";

// Define router
const router: Router = express.Router();

router.get("/:key", requireAuth, async (req, res, next) => {
  requireRole(
    [ROLES.ADMIN, ROLES.LEARNER],
    req,
    res,
    next,
    async (req, res, next) => {
      try {
        // Config aws
        const ep = new AWS.Endpoint("s3.wasabisys.com");
        const s3 = new AWS.S3({ endpoint: ep });
        // Config params
        const params = {
          Bucket: "cnht-main-bucket",
          Key: req.params.key,
        };
        // Send image to client
        return s3.getObject(params).createReadStream().pipe(res);
      } catch (error) {
        log(error.message);
        res.status(500).json({
          message: log(error.message),
        });
      }
    }
  );
});

export default router;
