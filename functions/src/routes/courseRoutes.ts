import express, { Router, Request, Response, NextFunction } from "express";
import { log } from "../utils";
import { Lecture, ROLES } from "../types";
import { Op, Model } from "sequelize";
import requireAuth from "../middleware/requireAuth";
import requireRole from "../middleware/requireRole";
import CourseModel from "../models/course";
import SectionModel from "../models/section";
import LectureModel from "../models/lecture";
import AWS from "aws-sdk";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import os from "os";
import { join, sep } from "path";
// Define router
const router: Router = express.Router();

const ep = new AWS.Endpoint("s3.wasabisys.com");
const s3 = new AWS.S3({ endpoint: ep });

const fileStorage: { [index: string]: Array<Buffer> } = {};
// POST: upload thumbnail
router.post(
  "/:courseId/thumbnail",
  async (req: Request, res: Response, next: NextFunction) => {
    const fileId = req.headers["x-content-id"];
    const chunkSize = Number(req.headers["x-chunk-length"]);
    const chunkId = Number(req.headers["x-chunk-id"]);
    const chunksQuantity = Number(req.headers["x-chunks-quantity"]);
    const fileName = req.headers["x-content-name"];
    const fileSize = Number(req.headers["x-content-length"]);
    const file = (fileStorage[fileId as string] =
      fileStorage[fileId as string] || []);
    const chunk: Buffer[] = [];
    try {
      console.log(chunkSize);
      chunk.push(req.body);
      const completeChunk = Buffer.concat(chunk);
      if (completeChunk.length !== chunkSize) {
        return res.status(400).json({
          message: "Bad request",
        });
      }

      file[chunkId] = completeChunk;
      console.log(file);
      console.log(chunksQuantity);
      const fileCompleted =
        file.filter((chunk) => chunk).length === chunksQuantity;
      console.log(fileCompleted);

      if (fileCompleted) {
        const completeFile = Buffer.concat(file);
        if (completeFile.length !== fileSize) {
          return res.status(400).json({
            message: "Bad request",
          });
        }

        delete fileStorage[fileId as string];

        const _id = uuidv4();
        const extension = (fileName! as string).split(".")[1];
        const params = {
          Bucket: "cnht-main-bucket",
          Body: completeFile,
          Key: _id + "." + extension,
        };
        await s3.putObject(params).promise();

        res.setHeader("Content-Type", "application/json");
        res.write(JSON.stringify({ status: 200 }));
        res.end();
      } else {
        res.status(200).json({
          message: "Continuing",
        });
      }
    } catch (err) {
      console.log(err);
      return res.status(500).json({ message: "Server error" });
    }
  }
);

// POST method: create new course
router.post(
  "/",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    requireRole([ROLES.ADMIN], req, res, next, async (req, res, next) => {
      if (req.file) {
        const _id = uuidv4();
        const extension = req.file.originalname.split(".")[1];
        const params = {
          Bucket: "cnht-main-bucket",
          Body: fs.createReadStream(req.file.path),
          Key: _id + "." + extension,
        };
        await s3.putObject(params).promise();
        fs.unlinkSync(req.file.path);

        try {
          const course = await CourseModel.create({
            title: req.body.title,
            courseDescription: req.body.courseDescription,
            price: req.body.price,
            courseType: req.body.courseType,
            grade: req.body.grade,
            thumbnailUrl: `/api/courses/thumbnail/${_id}.${extension}`,
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
    const courses = await CourseModel.findAll({
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
        let course = await CourseModel.findByPk(req.params.id);
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
        let course = await CourseModel.findByPk(req.params.id);
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

// GET method: get thumbnail of a course
router.get("/:courseId/thumbnail/:key", async (req, res, next) => {
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
});

// PUT method: update thumbnail
router.put("/:courseId/thumbnail", requireAuth, async (req, res, next) => {
  requireRole([ROLES.ADMIN], req, res, next, async (req, res, next) => {
    try {
      if (req.file) {
        const _id = uuidv4();

        const extension = req.file.originalname.split(".")[1];

        const params = {
          Bucket: "cnht-main-bucket",
          Body: fs.createReadStream(req.file.path),
          Key: _id + "." + extension,
        };

        await s3.putObject(params).promise();
        fs.unlinkSync(req.file.path);
        const currentCourse = await CourseModel.findOne({
          where: {
            isHidden: false,
            id: req.params.courseId,
          },
        });
        if (currentCourse) {
          currentCourse.thumbnailUrl = `/api/courses/thumbnail/${_id}.${extension}`;
          await currentCourse.save();
          await currentCourse.reload();
          res.status(201).json({
            message: log("Update thumbnail successfully"),
            count: 1,
            course: currentCourse,
          });
        } else {
          res.status(404).json({
            message: log("Course not found"),
          });
        }
      }
    } catch (error) {
      log(error.message);
      res.status(500).json({
        message: log(error.message),
      });
    }
  });
});

// GET method: get all lectures of a course by courseId
router.get("/:courseId/lectures", async (req, res, next) => {
  try {
    const sections = await SectionModel.findAll({
      where: {
        isHidden: false,
        courseId: req.params.courseId,
      },
    });
    console.log(sections);
    if (sections.length) {
      let lectures: Lecture[] = [];
      for (let s of sections) {
        const ls = await LectureModel.findAll({
          where: {
            isHidden: false,
            sectionId: s.id,
          },
        });
        lectures = lectures.concat(ls);
        console.log(ls);
      }
      if (lectures.length) {
        res.status(200).json({
          message: "All lectures found",
          count: lectures.length,
          lectures: lectures,
        });
      } else {
        res.status(404).json({
          message: "No lectures found",
          count: 0,
          lectures: [],
        });
      }
    } else {
      res.status(404).json({
        message: "Cannot find sections",
        count: 0,
        lectures: [],
      });
    }
  } catch (error) {
    log(error.message);
    res.status(500).json({
      message: log(error.message),
      count: 0,
      lectures: [],
    });
  }
});
export default router;
