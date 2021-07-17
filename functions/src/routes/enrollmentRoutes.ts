import express, { Router, Request, Response, NextFunction } from "express";
import { log, momentFormat } from "../utils";
import { ROLES } from "../types";
import requireAuth from "../middleware/requireAuth";
import requireRole from "../middleware/requireRole";
import db from "../database/firestoreConnection";
import { v4 as uuidv4 } from "uuid";
// Define router
const router: Router = express.Router();

// POST method: create new enrollment
router.post(
  "/",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    requireRole([ROLES.LEARNER], req, res, next, async (req, res, next) => {
      try {
        const createdAt = momentFormat();
        const updatedAt = momentFormat();
        const id = uuidv4();
        const enrollment = await db.collection("enrollments").doc(id).set({
          id: id,
          courseId: req.body.courseId,
          learnerId: req.body.learnerId,
          isHidden: false,
          createdAt: createdAt,
          updatedAt: updatedAt,
        });

        if (enrollment) {
          const snapshot = await db
            .collection("courses")
            .where("isHidden", "==", false)
            .where("id", "==", req.body.courseId)
            .get();
          if (snapshot.docs.length) {
            const course = snapshot.docs[0].data();
            if (course) {
              await db
                .collection("courses")
                .doc(course.id)
                .update({
                  learnerCount: course.learnerCount + 1,
                  updatedAt: updatedAt,
                });
              res.status(201).json({
                message: log("Create new enrollment successfully"),
                count: 1,
                enrollment: {
                  id: id,
                  courseId: req.body.courseId,
                  learnerId: req.body.learnerId,
                  isHidden: false,
                  createdAt: createdAt,
                  updatedAt: updatedAt,
                },
              });
            } else {
              res.status(500).json({
                message: log("Cannot create enrollment"),
                count: 0,
                enrollment: null,
              });
            }
          } else {
            res.status(404).json({
              message: log("Course not found"),
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
          const snapshot = await db
            .collection("enrollments")
            .where("isHidden", "==", false)
            .get();
          if (snapshot.docs.length) {
            let enrollments = snapshot.docs.map((e) => e.data());
            const courseId = req.query.courseId;
            const learnerId = req.query.learnerId;
            if (courseId) {
              enrollments = enrollments.filter((e) => e.courseId == courseId);
            }
            if (learnerId) {
              enrollments = enrollments.filter((e) => e.learnerId == learnerId);
            }
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
          } else {
            res.status(404).json({
              message: "Enrollment not found",
              count: 0,
              enrollments: null,
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
