import express, { Router, Request, Response, NextFunction } from "express";
import { log } from "../utils";
import { ROLES } from "../types";
import { Op, Model } from "sequelize";
import requireAuth from "../middleware/requireAuth";
import requireRole from "../middleware/requireRole";
import Enrollment from "../models/enrollment";
import Course from "../models/course";
// Define router
const router: Router = express.Router();

// POST method: create new enrollment
router.post(
  "/",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    requireRole([ROLES.LEARNER], req, res, next, async (req, res, next) => {
      try {
        const enrollment = await Enrollment.create({
          courseId: req.body.courseId,
          learnerId: req.body.learnerId,
        });
        if (enrollment) {
          const course = await Course.findOne({
            where: {
              isHidden: false,
              id: req.body.courseId,
            },
          });
          await enrollment.reload();
          if (course) {
            course.learnerCount += 1;
            await course.save();
            await course.reload();
            res.status(201).json({
              message: log("Create new enrollment successfully"),
              count: 1,
              enrollment: enrollment,
            });
          } else {
            res.status(500).json({
              message: log("Cannot create enrollment"),
              count: 0,
              enrollment: null,
            });
          }
        } else {
          res.status(500).json({
            message: log("Cannot create enrollment"),
            count: 0,
            enrollment: null,
          });
        }
      } catch (error) {
        log(error.message);
        res.status(500).json({
          message: log(error.message),
          count: 0,
          enrollment: null,
        });
      }
    });
  }
);

// GET method: get enrollments by filters
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
          // Find enrollments from filter
          const enrollments = await Enrollment.findAll({
            where: {
              [Op.and]: reqParams,
            },
          });
          if (enrollments.length) {
            res.status(200).json({
              message: log("enrollments found"),
              count: enrollments.length,
              enrollments: enrollments,
            });
          } else {
            res.status(404).json({
              message: log("No enrollments found"),
              count: 0,
              enrollments: [],
            });
          }
        } catch (error) {
          console.log(error.message);
          res.status(500).json({
            message: log("No enrollments found"),
            count: 0,
            enrollments: [],
          });
        }
      }
    );
  }
);

export default router;
