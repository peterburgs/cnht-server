import express, { Router, Request, Response, NextFunction } from "express";
import { log, momentFormat } from "../utils";
import { Lecture, ROLES, Course, Section, Video } from "../types";
import requireAuth from "../middleware/requireAuth";
import requireRole from "../middleware/requireRole";
import { v4 as uuidv4 } from "uuid";
import { Storage } from "@google-cloud/storage";
import path from "path";
import db from "../database/firestoreConnection";
import moment from "moment";
// Define router
const router: Router = express.Router();

const storage = new Storage({
  keyFilename: path.join(__dirname, "../key.json"),
  projectId: process.env.PROJECT_ID,
});
const bucket = storage.bucket(process.env.BUCKET!);

const fileStorage: { [index: string]: Array<Buffer> } = {};

// POST: upload thumbnail
router.post(
  "/:courseId/thumbnail",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    requireRole([ROLES.ADMIN], req, res, next, async (req, res, next) => {
      const courseId = req.params.courseId;
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
        chunk.push(req.body);
        const completeChunk = Buffer.concat(chunk);
        if (completeChunk.length !== chunkSize) {
          return res.status(400).json({
            message: "Bad request",
          });
        }
        file[chunkId] = completeChunk;
        const fileCompleted =
          file.filter((chunk) => chunk).length === chunksQuantity;
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
          const fileInBucket = bucket.file(_id + "." + extension);
          await fileInBucket.save(completeFile);

          const snapshot = await db
            .collection("courses")
            .where("isHidden", "==", false)
            .where("id", "==", courseId)
            .get();
          const course = snapshot.docs[0].data();
          if (course) {
            const updatedCourse = await db
              .collection("courses")
              .doc(courseId)
              .update({
                thumbnailUrl: `/api/courses/thumbnail/${_id}.${extension}`,
              });
            return res.status(201).json({
              message: "Thumbnail uploaded",
              course: updatedCourse,
            });
          } else {
            return res.status(404).json({ message: "Cannot find course" });
          }
        } else {
          res.status(200).json({
            message: "Continuing",
          });
        }
      } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Server error" });
      }
    });
  }
);

// POST method: create new course
router.post(
  "/",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    requireRole([ROLES.ADMIN], req, res, next, async (req, res, next) => {
      try {
        const createdAt = momentFormat();
        const updatedAt = momentFormat();
        const courseId = uuidv4();
        const course = await db.collection("courses").doc(courseId).set({
          id: courseId,
          title: req.body.title,
          courseDescription: req.body.courseDescription,
          price: req.body.price,
          courseType: req.body.courseType,
          grade: req.body.grade,
          isPublished: req.body.isPublished,
          learnerCount: 0,
          lectureCount: 0,
          sectionCount: 0,
          thumbnailUrl: "",
          isHidden: false,
          createdAt: createdAt,
          updatedAt: updatedAt,
        });
        if (course) {
          res.status(201).json({
            message: log("Create new course successfully"),
            count: 1,
            course: {
              id: courseId,
              title: req.body.title,
              courseDescription: req.body.courseDescription,
              price: req.body.price,
              courseType: req.body.courseType,
              grade: req.body.grade,
              isPublished: req.body.isPublished,
              learnerCount: 0,
              lectureCount: 0,
              sectionCount: 0,
              thumbnailUrl: "",
              isHidden: false,
              createdAt: createdAt,
              updatedAt: updatedAt,
            },
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
    const snapshot = await db
      .collection("courses")
      .where("isHidden", "==", false)
      .get();
    if (snapshot.docs.length) {
      let courses = snapshot.docs.map((doc) => doc.data());
      const courseId = req.query.id;
      const courseTitle = req.query.title;
      const courseType = req.query.courseType;
      const courseGrade = req.query.grade;
      const isPublished = req.query.isPublished;
      if (courseId) {
        courses = courses.filter((course) => course.id === courseId);
      }
      if (courseTitle) {
        courses = courses.filter((course) =>
          course.title.includes(courseTitle)
        );
      }
      if (courseType) {
        courses = courses.filter((course) => course.courseType == courseType);
      }
      if (courseGrade) {
        courses = courses.filter((course) => course.grade == courseGrade);
      }
      if (isPublished) {
        courses = courses.filter((course) => course.isPublished == isPublished);
      }
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
    } else {
      res.status(404).json({
        message: "Cannot find course",
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

// PUT method: update a course by id
router.put(
  "/:id",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    requireRole([ROLES.ADMIN], req, res, next, async (req, res, next) => {
      try {
        const courseId = req.params.id;
        let snapshot = await db
          .collection("courses")
          .where("id", "==", courseId)
          .get();
        if (snapshot.docs.length) {
          const updatedAt = moment(new Date()).format("YYYY/MM/DD HH:mm:ss");
          await db.collection("courses").doc(courseId).update({
            title: req.body.title,
            courseDescription: req.body.courseDescription,
            price: req.body.price,
            courseType: req.body.courseType,
            grade: req.body.grade,
            isPublished: req.body.isPublished,
            updatedAt: updatedAt,
          });
          let course = snapshot.docs[0].data();
          course.updatedAt = updatedAt;
          course.title = req.body.title;
          course.courseDescription = req.body.courseDescription;
          course.price = req.body.price;
          course.courseType = req.body.courseType;
          course.grade = req.body.grade;
          course.isPublished = req.body.isPublished;
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
        const courseId = req.params.id;
        // Find course by id
        let course = await db.collection("courses").where("id", "==", courseId);
        if (course) {
          const updatedAt = moment(new Date()).format("YYYY/MM/DD HH:mm:ss");

          const deletedCourse = await db
            .collection("courses")
            .doc(courseId)
            .update({
              isHidden: true,
              updatedAt: updatedAt,
            });
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

// GET method: get the thumbnail of a course
router.get("/thumbnail/:key", async (req, res, next) => {
  try {
    const file = bucket.file(req.params.key);
    return file.createReadStream().pipe(res);
  } catch (err) {
    log(err.message);
    res.status(500).json({
      message: log(err.message),
    });
  }
});

// GET method: get all lectures of a course by courseId
router.get("/:courseId/lectures", async (req, res, next) => {
  try {
    const courseId = req.params.courseId;
    const sectionSnapShot = await db
      .collection("sections")
      .where("isHidden", "==", false)
      .where("courseId", "==", courseId)
      .get();
    if (sectionSnapShot.docs.length) {
      const sections = sectionSnapShot.docs
        .map((section) => section.data())
        .filter((section) => section.courseId === courseId);
      if (sections.length) {
        let lectures: Lecture[] = [];
        for (let s of sections) {
          const l = await db
            .collection("lectures")
            .where("isHidden", "==", false)
            .where("sectionId", "==", s.id)
            .get();
          if (l.docs.length) {
            lectures = lectures.concat(
              l.docs.map((singleLecture) => singleLecture.data() as Lecture)
            );
          } else {
            res.status(404).json({
              message: "Cannot find section",
            });
          }
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
    } else {
      res.status(404).json({
        message: "Cannot find section",
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

// GET method: estimate course pricing
router.get("/:courseId/pricing", async (req, res, next) => {
  const courseId = req.params.courseId;
  const courseSnapshot = await db
    .collection("courses")
    .where("isHidden", "==", false)
    .where("id", "==", courseId)
    .get();
  if (courseSnapshot.docs.length) {
    const sectionSnapShot = await db
      .collection("sections")
      .where("isHidden", "==", false)
      .where("courseId", "==", courseId)
      .get();
    if (sectionSnapShot.docs.length) {
      const sections = sectionSnapShot.docs.map((section) => section.data());
      let _lectures: Lecture[] = [];
      for (let i = 0; i < sections.length; i++) {
        const lectureSnapShot = await db
          .collection("lectures")
          .where("isHidden", "==", false)
          .where("sectionId", "==", sections[i].id)
          .get();
        if (lectureSnapShot.docs.length) {
          _lectures = _lectures.concat(
            lectureSnapShot.docs.map((l) => l.data() as Lecture)
          );
          let _videos: Video[] = [];
          for (let j = 0; j < _lectures.length; j++) {
            const videoSnapShot = await db
              .collection("videos")
              .where("isHidden", "==", false)
              .where("lectureId", "==", _lectures[i].id)
              .get();
            if (videoSnapShot.docs.length) {
              _videos = _videos.concat(
                videoSnapShot.docs.map((video) => video.data() as Video)
              );
              if (_videos.length == 0) {
                return res.status(404).json({
                  message: log("No lectures found"),
                  price: 0,
                });
              }
              const totalBytes = _videos.reduce((e, i) => e + i.size, 0);
              const scala = 23500 / (1024 * 1024 * 1024);
              res.status(200).json({
                message: log("Get estimated pricing successfully"),
                price: Math.floor(totalBytes * 2 * scala),
              });
            } else {
              res.status(404).json({
                message: "Cannot find video",
              });
            }
          }
        } else {
          res.status(404).json({
            message: "Cannot find lectures",
          });
        }
      }
    } else {
      res.status(404).json({
        message: log("Sections not found"),
        price: 0,
      });
    }
  } else {
    res.status(404).json({
      message: log("Course not found"),
      price: 0,
    });
  }
});

// GET method: get all sections by course id
router.get("/:courseId/sections", async (req, res, next) => {
  try {
    const courseId = req.params.courseId;
    const sectionSnapShot = await db
      .collection("sections")
      .where("courseId", "==", courseId)
      .where("isHidden", "==", false)
      .get();
    if (sectionSnapShot.docs.length) {
      const sections = sectionSnapShot.docs.map((section) => section.data());
      sections.sort((a, b) => a.sectionOrder - b.sectionOrder);
      res.status(200).json({
        message: log("Get sections successfully"),
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
    res.status(500).json({
      message: log(error.message),
      count: 0,
      sections: [],
    });
  }
});

export default router;
