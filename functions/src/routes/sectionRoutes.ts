import express, { Router, Request, Response, NextFunction } from "express";
import { log, momentFormat } from "../utils";
import { ROLES } from "../types";
import requireAuth from "../middleware/requireAuth";
import requireRole from "../middleware/requireRole";
import db from "../database/firestoreConnection";
import { v4 as uuidv4 } from "uuid";
import moment from "moment";

// Define router
const router: Router = express.Router();

// POST method: create new section
router.post(
  "/",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    requireRole([ROLES.ADMIN], req, res, next, async (req, res, next) => {
      try {
        const sectionId = uuidv4();
        const courseSnapshot = await db
          .collection("courses")
          .where("isHidden", "==", false)
          .where("id", "==", req.body.courseId)
          .get();
        if (courseSnapshot.docs.length) {
          const course = courseSnapshot.docs[0].data();
          const sectionCount = course.sectionCount + 1;
          await db.collection("courses").doc(course.id).update({
            sectionCount: sectionCount,
          });
          const createdAt = momentFormat();
          const updatedAt = momentFormat();
          const section = await db.collection("sections").doc(sectionId).set({
            id: sectionId,
            title: req.body.title,
            courseId: req.body.courseId,
            sectionOrder: sectionCount,
            isHidden: false,
            createdAt: createdAt,
            updatedAt: updatedAt,
          });
          if (section) {
            res.status(201).json({
              message: log("Create new section successfully"),
              count: 1,
              section: {
                id: sectionId,
                title: req.body.title,
                courseId: req.body.courseId,
                sectionOrder: sectionCount,
                isHidden: false,
                createdAt: createdAt,
                updatedAt: updatedAt,
              },
            });
          } else {
            res.status(500).json({
              message: log("Cannot create section"),
              count: 0,
              section: null,
            });
          }
        } else {
          res.status(404).json({
            message: log("Course not found"),
            count: 0,
            section: null,
            course: null,
          });
        }
      } catch (error) {
        log(error.message);
        res.status(500).json({
          message: log(error.message),
          count: 0,
          section: null,
        });
      }
    });
  }
);

// GET method: get sections by filters
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sectionSnapShot = await db
      .collection("sections")
      .where("isHidden", "==", false)
      .get();
    let sections = sectionSnapShot.docs.map((section) => section.data());
    const sectionId = req.query.id;
    const title = req.query.title;
    const courseId = req.query.courseId;
    if (sectionId) {
      sections = sections.filter((section) => section.id == sectionId);
    }
    if (title) {
      sections = sections.filter((section) => section.title == title);
    }
    if (courseId) {
      sections = sections.filter((section) => section.courseId == courseId);
    }
    if (sections.length) {
      res.status(200).json({
        message: log("Sections found"),
        count: sections.length,
        sections: sections,
      });
    } else {
      res.status(404).json({
        message: log("No sections found"),
        count: 0,
        sections: [],
      });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).json({
      message: log("No sections found"),
      count: 0,
      sections: [],
    });
  }
});
// PUT method: update a section by id

router.put(
  "/:id",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    requireRole([ROLES.ADMIN], req, res, next, async (req, res, next) => {
      try {
        const sectionId = req.params.id;
        const snapshot = await db
          .collection("sections")
          .where("isHidden", "==", false)
          .where("id", "==", sectionId)
          .get();
        let section = snapshot.docs[0].data();
        if (section) {
          const updatedAt = momentFormat();
          await db.collection("sections").doc(sectionId).update({
            title: req.body.title,
            updatedAt: updatedAt,
          });
          section.title = req.body.title;
          section.updatedAt = updatedAt;
          res.status(200).json({
            message: log("Update section successfully"),
            count: 1,
            section: section,
          });
        } else {
          res.status(404).json({
            message: log("Section not found"),
            count: 0,
            section: null,
          });
        }
      } catch (error) {
        log(error.message);
        res.status(500).json({
          message: log(error.message),
          count: 0,
          section: null,
        });
      }
    });
  }
);

// DELETE method: delete a section
router.delete(
  "/:id",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    requireRole([ROLES.ADMIN], req, res, next, async (req, res, next) => {
      try {
        const snapshot = await db
          .collection("sections")
          .where("isHidden", "==", false)
          .where("id", "==", req.params.id)
          .get();
        if (snapshot.docs.length) {
          const updatedAt = momentFormat();
          const section = snapshot.docs[0].data();
          await db.collection("sections").doc(req.params.id).update({
            isHidden: true,
            updatedAt: updatedAt,
          });
          res.status(200).json({
            message: log("Delete section successfully"),
          });
        } else {
          res.status(404).json({
            message: log("Section not found"),
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

// PUT method: move a section down
router.put("/:sectionId/down", requireAuth, async (req, res, next) => {
  requireRole([ROLES.ADMIN], req, res, next, async (req, res, next) => {
    const snapshot = await db
      .collection("sections")
      .where("isHidden", "==", false)
      .where("id", "==", req.params.sectionId)
      .get();
    if (snapshot.docs.length) {
      const updatedAt = momentFormat();
      const section = snapshot.docs[0].data();
      const sectionsSnapshot = await db
        .collection("sections")
        .where("isHidden", "==", false)
        .where("courseId", "==", section.courseId)
        .get();
      const sections = sectionsSnapshot.docs.map((section) => section.data());
      sections.sort((a, b) => a.sectionOrder - b.sectionOrder);
      if (sections.length) {
        const sectionIndex = sections.findIndex((s) => s.id == section.id);
        if (sectionIndex === sections.length - 1) {
          res.status(400).json({
            message: log("This section is already on bottom, cannot move down"),
          });
        } else {
          const index = sections.findIndex((e) => e.id === section!.id);
          const tempOrder = section.sectionOrder;
          await db
            .collection("sections")
            .doc(section.id)
            .update({
              sectionOrder: sections[index + 1].sectionOrder,
              updatedAt: updatedAt,
            });
          await db
            .collection("sections")
            .doc(sections[index + 1].id)
            .update({
              sectionOrder: tempOrder,
              updatedAt: updatedAt,
            });
          res.status(200).json({
            message: log("Move section down successfully"),
          });
        }
      } else {
        res.status(404).json({
          message: log(
            "Cannot move section down since no section found or only one section existed"
          ),
        });
      }
    } else {
      res.status(404).json({
        message: log("Section not found"),
      });
    }
  });
});

// PUT method: move a section up
router.put("/:sectionId/up", requireAuth, async (req, res, next) => {
  requireRole([ROLES.ADMIN], req, res, next, async (req, res, next) => {
    const sectionId = req.params.sectionId;
    const sectionSnapShot = await db
      .collection("sections")
      .where("isHidden", "==", false)
      .where("id", "==", sectionId)
      .get();
    if (sectionSnapShot.docs.length) {
      const updatedAt = momentFormat();
      const section = sectionSnapShot.docs[0].data();
      const sectionsSnapshot = await db
        .collection("sections")
        .where("isHidden", "==", false)
        .where("courseId", "==", section.courseId)
        .get();
      const sections = sectionsSnapshot.docs.map((section) => section.data());
      sections.sort((a, b) => a.sectionOrder - b.sectionOrder);
      if (sections.length) {
        const sectionIndex = sections.findIndex((s) => s.id == section.id);
        if (sectionIndex == 0) {
          res.status(400).json({
            message: log("This section is already on top, cannot move up"),
          });
        } else {
          const index = sections.findIndex((e) => e.id === section!.id);
          const tempOrder = section.sectionOrder;
          await db
            .collection("sections")
            .doc(section.id)
            .update({
              sectionOrder: sections[index - 1].sectionOrder,
              updatedAt: updatedAt,
            });
          await db
            .collection("sections")
            .doc(sections[index - 1].id)
            .update({
              sectionOrder: tempOrder,
              updatedAt: updatedAt,
            });
          res.status(200).json({
            message: log("Move section up successfully"),
          });
        }
      } else {
        res.status(404).json({
          message: log("Section not found"),
        });
      }
    } else {
      res.status(404).json({
        message: log("Section not found"),
      });
    }
  });
});

// GET method: get all lectures of a section by section id
router.get("/:sectionId/lectures", async (req, res, next) => {
  try {
    const sectionId = req.params.sectionId;
    const snapshot = await db
      .collection("sections")
      .where("isHidden", "==", false)
      .where("sectionId", "==", sectionId)
      .get();
    if (snapshot.docs.length) {
      const lectures = snapshot.docs.map((lecture) => lecture.data());
      lectures.sort((a, b) => a.lectureOrder - b.lectureOrder);
      res.status(200).json({
        message: log("Get lectures successfully"),
        count: lectures.length,
        lectures: lectures,
      });
    } else {
      res.status(404).json({
        message: log("No lecture found"),
        count: 0,
        lectures: null,
      });
    }
  } catch (error) {
    res.status(500).json({
      message: log(error.message),
      count: 0,
      lectures: null,
    });
  }
});

export default router;
