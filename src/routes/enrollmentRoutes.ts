import express, { Router, Request, Response, NextFunction } from "express";
import { log } from "../utils";
import { ROLES } from "../types";
import { Op, Model } from "sequelize";
import requireAuth from "../middleware/requireAuth";
import requireRole from "../middleware/requireRole";
import Enrollment from "../models/enrollment";
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
          await enrollment.reload();
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
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
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
});
// PUT method: update a enrollment by PK

router.put(
  "/:id",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    requireRole([ROLES.LEARNER], req, res, next, async (req, res, next) => {
      try {
        // Find enrollment by id
        let enrollment = await Enrollment.findByPk(req.params.id);
        if (enrollment) {
          // Update
          enrollment.courseId = req.body.courseId;
          enrollment.learnerId = req.body.learnerId;
          // Save
          await enrollment.save();
          // Refresh from database
          await enrollment.reload();
          res.status(200).json({
            message: log("Update enrollment successfully"),
            count: 1,
            enrollment: enrollment,
          });
        } else {
          res.status(404).json({
            message: log("enrollment not found"),
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

export default router;
