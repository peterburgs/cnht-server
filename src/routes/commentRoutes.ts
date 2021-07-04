import express, { Router, Request, Response, NextFunction } from "express";
import { log } from "../utils";
import { ROLES } from "../types";
import { Op, Model } from "sequelize";
import requireAuth from "../middleware/requireAuth";
import requireRole from "../middleware/requireRole";
import Lecture from "../models/lecture";
import Comment from "../models/comment";
// Define router
const router: Router = express.Router();

// POST method: create new lecture
router.post(
  "/",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    requireRole([ROLES.ADMIN], req, res, next, async (req, res, next) => {
      try {
        const lecture = await Lecture.create({
          title: req.body.title,
          sectionId: req.body.sectionId,
          lectureOrder: req.body.lectureOrder,
          isHidden: req.body.isHidden,
        });
        if (lecture) {
          await lecture.reload();
          res.status(201).json({
            message: log("Create new lecture successfully"),
            count: 1,
            lecture: lecture,
          });
        } else {
          res.status(500).json({
            message: log("Cannot create lecture"),
            count: 0,
            lecture: null,
          });
        }
      } catch (error) {
        log(error.message);
        res.status(500).json({
          message: log(error.message),
          count: 0,
          lecture: null,
        });
      }
    });
  }
);

// GET method: get lectures by filters
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Create filter from request query
    let reqParams: { [key: string]: string }[] = [];
    for (let [key, value] of Object.entries(req.query)) {
      reqParams.push({ [key]: String(value) });
    }

    // Find course from filter
    const lectures = await Lecture.findAll({
      where: {
        isHidden: false,
        [Op.and]: reqParams,
      },
    });
    if (lectures.length) {
      res.status(200).json({
        message: log("Lectures found"),
        count: lectures.length,
        lectures: lectures,
      });
    } else {
      res.status(404).json({
        message: log("No lectures found"),
        count: 0,
        lectures: [],
      });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).json({
      message: log("No lectures found"),
      count: 0,
      lectures: [],
    });
  }
});
// PUT method: update a lecture by PK

router.put(
  "/:id",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    requireRole([ROLES.ADMIN], req, res, next, async (req, res, next) => {
      try {
        // Find lecture by id
        let lecture = await Lecture.findByPk(req.params.id);
        if (lecture) {
          // Update
          lecture.title = req.body.title;
          lecture.sectionId = req.body.sectionId;
          lecture.lectureOrder = req.body.lectureOrder;
          lecture.isHidden = req.body.isHidden;
          // Save
          await lecture.save();
          // Refresh from database
          await lecture.reload();
          res.status(200).json({
            message: log("Update lecture successfully"),
            count: 1,
            lecture: lecture,
          });
        } else {
          res.status(404).json({
            message: log("lecture not found"),
            count: 0,
            lecture: null,
          });
        }
      } catch (error) {
        log(error.message);
        res.status(500).json({
          message: log(error.message),
          count: 0,
          lecture: null,
        });
      }
    });
  }
);

// DELETE method: delete a lecture
router.delete(
  "/:id",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    requireRole([ROLES.ADMIN], req, res, next, async (req, res, next) => {
      try {
        // Find lecture by id
        let lecture = await Lecture.findByPk(req.params.id);
        if (lecture) {
          // Mark as hidden
          lecture.isHidden = true;
          // Save
          await lecture.save();
          // Refresh from database
          await lecture.reload();
          res.status(200).json({
            message: log("Delete lecture successfully"),
          });
        } else {
          res.status(404).json({
            message: log("lecture not found"),
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
