import express, { Router, Request, Response, NextFunction } from "express";
import { log } from "../utils";
import { ROLES } from "../types";
import { Op, Model } from "sequelize";
import requireAuth from "../middleware/requireAuth";
import requireRole from "../middleware/requireRole";
import Course from "../models/course";
// Define router
const router: Router = express.Router();

// POST method: create new course
router.post(
  "/",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    requireRole([ROLES.ADMIN], req, res, next, async (req, res, next) => {
      try {
        const course = await Course.create({
          title: req.body.title,
          courseDescription: req.body.courseDescription,
          price: req.body.price,
          courseType: req.body.courseType,
          grade: req.body.grade,
          thumbnailUrl: req.body.thumbnailUrl,
          isHidden: req.body.isHidden,
        });
        if (course) {
          await course.reload();
          res.status(201).json({
            message: log("Create new course successfully"),
            count: 1,
            course: course,
          });
        } else {
          res.status(500).json({
            message: log("Cannot create course"),
            count: 0,
            course: null,
          });
        }
      } catch (error) {
        log(error.message);
        res.status(500).json({
          message: log(error.message),
          count: 0,
          course: null,
        });
      }
    });
  }
);

// GET method: get courses by filters
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Create filter from request query
    let reqParams: { [key: string]: string }[] = [];
    for (let [key, value] of Object.entries(req.query)) {
      reqParams.push({ [key]: String(value) });
    }

    // Find course from filter
    const courses = await Course.findAll({
      where: {
        isHidden: false,
        [Op.and]: reqParams,
      },
    });
    if (courses.length) {
      res.status(200).json({
        message: log("Courses found"),
        count: courses.length,
        courses: courses,
      });
    } else {
      res.status(404).json({
        message: log("No courses found"),
        count: 0,
        courses: [],
      });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).json({
      message: log("No courses found"),
      count: 0,
      courses: [],
    });
  }
});
// PUT method: update a course by PK

router.put(
  "/:id",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    requireRole([ROLES.ADMIN], req, res, next, async (req, res, next) => {
      try {
        // Find course by id
        let course = await Course.findByPk(req.params.id);
        if (course) {
          // Update
          course.title = req.body.title;
          course.courseDescription = req.body.courseDescription;
          course.price = req.body.price;
          course.courseType = req.body.courseType;
          course.grade = req.body.grade;
          course.thumbnailUrl = req.body.thumbnailUrl;
          course.isHidden = req.body.isHidden;
          // Save
          await course.save();
          // Refresh from database
          await course.reload();
          res.status(200).json({
            message: log("Update course successfully"),
            count: 1,
            course: course,
          });
        } else {
          res.status(404).json({
            message: log("Course not found"),
            count: 0,
            course: null,
          });
        }
      } catch (error) {
        log(error.message);
        res.status(500).json({
          message: log(error.message),
          count: 0,
          course: null,
        });
      }
    });
  }
);

// DELETE method: delete a course
router.delete(
  "/:id",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    requireRole([ROLES.ADMIN], req, res, next, async (req, res, next) => {
      try {
        // Find course by id
        let course = await Course.findByPk(req.params.id);
        if (course) {
          // Mark as hidden
          course.isHidden = true;
          // Save
          await course.save();
          // Refresh from database
          await course.reload();
          res.status(200).json({
            message: log("Delete course successfully"),
          });
        } else {
          res.status(404).json({
            message: log("Course not found"),
          });
        }
      } catch (error) {
        log(error.message);
        res.status(500).json({
          message: log(error.message),
        });
      }
    });
  }
);

export default router;
