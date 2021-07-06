import express, { Router, Request, Response, NextFunction } from "express";
import { log } from "../utils";
import { ROLES } from "../types";
import { Op, Model } from "sequelize";
import requireAuth from "../middleware/requireAuth";
import requireRole from "../middleware/requireRole";
import Section from "../models/section";
// Define router
const router: Router = express.Router();

// POST method: create new section
router.post(
  "/",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    requireRole([ROLES.ADMIN], req, res, next, async (req, res, next) => {
      try {
        const section = await Section.create({
          title: req.body.title,
          courseId: req.body.courseId,
          sectionOrder: req.body.sectionOrder,
          isHidden: req.body.isHidden,
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
// PUT method: update a section by PK

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
          section.courseId = req.body.courseId;
          section.sectionOrder = req.body.sectionOrder;
          section.isHidden = req.body.isHidden;
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

export default router;
