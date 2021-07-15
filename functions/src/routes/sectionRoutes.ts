import express, { Router, Request, Response, NextFunction } from "express";
import { log } from "../utils";
import { ROLES } from "../types";
import { Op, Model } from "sequelize";
import requireAuth from "../middleware/requireAuth";
import requireRole from "../middleware/requireRole";
import Section from "../models/section";
import Course from "../models/course";
import Lecture from "../models/lecture";

// Define router
const router: Router = express.Router();

// POST method: create new section
router.post(
  "/",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    requireRole([ROLES.ADMIN], req, res, next, async (req, res, next) => {
      try {
        const course = await Course.findOne({
          where: {
            isHidden: false,
            id: req.body.courseId,
          },
        });
        if (course) {
          course.sectionCount += 1;
          await course.save();
          await course.reload();
          const section = await Section.create({
            title: req.body.title,
            courseId: req.body.courseId,
            sectionOrder: course.sectionCount,
          });
          if (section) {
            await section.reload();

            res.status(201).json({
              message: log("Create new section successfully"),
              count: 1,
              section: section,
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
    // Create filter from request query
    let reqParams: { [key: string]: string }[] = [];
    for (let [key, value] of Object.entries(req.query)) {
      reqParams.push({ [key]: String(value) });
    }

    // Find course from filter
    const sections = await Section.findAll({
      where: {
        isHidden: false,
        [Op.and]: reqParams,
      },
    });
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
        // Find section by id
        let section = await Section.findByPk(req.params.id);
        if (section) {
          // Update
          section.title = req.body.title;
          section.sectionOrder = req.body.sectionOrder;
          // Save
          await section.save();
          // Refresh from database
          await section.reload();
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
        // Find section by id
        let section = await Section.findByPk(req.params.id);
        if (section) {
          // Mark as hidden
          section.isHidden = true;
          // Save
          await section.save();
          // Refresh from database
          await section.reload();
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
    let section = await Section.findOne({
      where: {
        isHidden: false,
        id: req.params.sectionId,
      },
    });
    if (section) {
      let sections = await Section.findAll({
        where: {
          isHidden: false,
          courseId: section.courseId,
        },
      });
      if (sections.length) {
        sections.sort((a, b) => a.sectionOrder - b.sectionOrder);
        const index = sections.findIndex((e) => e.id === section!.id);
        const tempOrder = section.sectionOrder;
        section.sectionOrder = sections[index + 1].sectionOrder;
        sections[index + 1].sectionOrder = tempOrder;
        await sections[index + 1].save();
        await sections[index + 1].reload();
        await section.save();
        await section.reload();
        res.status(200).json({
          message: log("Move section down successfully"),
        });
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

// PUT method: move a section up
router.put("/:sectionId/up", requireAuth, async (req, res, next) => {
  requireRole([ROLES.ADMIN], req, res, next, async (req, res, next) => {
    let section = await Section.findOne({
      where: {
        isHidden: false,
        id: req.params.sectionId,
      },
    });
    if (section) {
      let sections = await Section.findAll({
        where: {
          isHidden: false,
          courseId: section.courseId,
        },
      });
      if (sections.length) {
        sections.sort((a, b) => a.sectionOrder - b.sectionOrder);
        const index = sections.findIndex((e) => e.id === section!.id);
        const tempOrder = section.sectionOrder;
        section.sectionOrder = sections[index - 1].sectionOrder;
        sections[index - 1].sectionOrder = tempOrder;
        await sections[index - 1].save();
        await sections[index - 1].reload();
        await section.save();
        await section.reload();
        res.status(200).json({
          message: log("Move section up successfully"),
        });
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
  const lectures = await Lecture.findAll({
    where: {
      isHidden: false,
      sectionId: req.params.sectionId,
    },
  });
  if (lectures.length) {
    lectures.sort((a, b) => a.lectureOrder - b.lectureOrder);
    res.status(200).json({
      message: log("Get lectures successfully"),
      count: lectures.length,
      lectures: lectures,
    });
  }
});

export default router;
