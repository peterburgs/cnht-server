import express, { Router, Request, Response, NextFunction } from "express";
import { log } from "../utils";
import { ROLES } from "../types";
import { Op, Model } from "sequelize";
import requireAuth from "../middleware/requireAuth";
import requireRole from "../middleware/requireRole";
import Video from "../models/video";
import Enrollment from "../models/enrollment";
import Course from "../models/course";
import Section from "../models/section";
import Lecture from "../models/lecture";
import User from "../models/user";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import AWS from "aws-sdk";
import { auth, OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.CLIENT_ID);

// Config multer
import multer from "multer";
const upload = multer({
  dest: "/tmp/",
});
// Config aws
const ep = new AWS.Endpoint("s3.wasabisys.com");
const s3 = new AWS.S3({ endpoint: ep });

// Define router
const router: Router = express.Router();

// POST method: create new lecture
router.post(
  "/",
  upload.single("video"),
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    requireRole([ROLES.ADMIN], req, res, next, async (req, res, next) => {
      try {
        const lecture = await Lecture.create({
          title: req.body.title,
          sectionId: req.body.sectionId,
          lectureOrder: req.body.lectureOrder,
          isHidden: false,
        });
        if (lecture) {
          await lecture.reload();
          // res.status(201).json({
          //   message: log("Create new lecture successfully"),
          //   count: 1,
          //   lecture: lecture,
          // });
          if (req.file) {
            try {
              const _id = uuidv4();
              const extension = req.file.originalname.split(".")[1];
              const fileName = req.file.originalname.split(".")[0];
              // Config params
              const params = {
                Bucket: "cnht-main-bucket",
                Body: fs.createReadStream(req.file.path),
                Key: _id + "." + extension,
              };
              // Upload to S3
              await s3.putObject(params).promise();
              fs.unlinkSync(req.file.path);

              // Get video info from cloud

              const video = await Video.create({
                id: _id,
                fileName: fileName + "." + extension,
                length: req.body.length,
                lectureId: lecture.id,
                isHidden: false,
              });
              if (video) {
                await video.reload();
                res.status(201).json({
                  message: log("Create new video successfully"),
                  count: 1,
                  video: video,
                  lecture: lecture,
                });
              } else {
                res.status(500).json({
                  message: log("Cannot create new video"),
                  count: 0,
                  video: null,
                  lecture: null,
                });
              }
            } catch (error) {
              log(error.message);
              res.status(500).json({
                message: log(error.message),
                count: 0,
                video: null,
                lecture: null,
              });
            }
          } else {
            res.status(404).json({
              message: log("Video not found"),
              count: 0,
              video: null,
              lecture: null,
            });
          }
        } else {
          res.status(500).json({
            message: log("Cannot create lecture"),
            count: 0,
            lecture: null,
            video: null,
          });
        }
      } catch (error) {
        log(error.message);
        res.status(500).json({
          message: log(error.message),
          count: 0,
          lecture: null,
          video: null,
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
  upload.single("video"),
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

          // Handle admin update video
          if (req.file) {
            // find video in database
            const currentVideo = await Video.findOne({
              where: {
                isHidden: false,
                lectureId: lecture.id,
              },
            });
            if (currentVideo) {
              // mark hidden
              currentVideo.isHidden = true;
              await currentVideo.save();
              await currentVideo.reload();

              // create new video to wasabi
              const _id = uuidv4();
              const extension = req.file.originalname.split(".")[1];
              const fileName = req.file.originalname.split(".")[0];
              // Config params
              const params = {
                Bucket: "cnht-main-bucket",
                Body: fs.createReadStream(req.file.path),
                Key: _id + "." + extension,
              };
              // Upload to S3
              await s3.putObject(params).promise();
              fs.unlinkSync(req.file.path);

              // create new video to database

              const video = await Video.create({
                id: _id,
                fileName: fileName + "." + extension,
                length: req.body.length,
                lectureId: lecture.id,
                isHidden: false,
              });
              if (video) {
                await video.reload();
                res.status(201).json({
                  message: log("Update new video successfully"),
                  count: 1,
                  video: video,
                  lecture: lecture,
                });
              } else {
                res.status(500).json({
                  message: log("Cannot update new video"),
                  count: 0,
                  video: null,
                  lecture: null,
                });
              }
            } else {
              log("Video not found");
              res.status(404).json({
                message: log("Video not found"),
              });
            }
          }
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

// Verify token
const googleAuth = async (token: string) => {
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.CLIENT_ID!,
  });
  return ticket.getPayload();
};

// GET method: stream video from wasabi
router.get("/:lectureId/streaming", async (req, res, next) => {
  try {
    const token =
      req.query
        .RGhqHqXSZfjAiyXgzznYnHSKRvxiHBWvzLZFZTUxXhRjvqsagFwHzfXuQPWcTQALWHqGKUPBFmuLWmKavtRvBWriLgXWtCAuDrsukwgTBQfuPVOiSeWtLbNTgSjtgYtICvCzYSmxwIXGeurxyOcGlrjvcDaAIsDIBDziWipcZbBPVUlzwhnpvjPrVHghlOppHdRUxctaGRUcBQXUJutPBhNSzebikzpytuIADtOEswqcJxZsBvkwvDayDXrofHfpxOrYzTXLSvZTkXodWNimYNiTAlFywOcRFMFSaNYOQAsxsHiDFxnvwFHkwMivNjJqAalJaUqmUDHkrWnGWnPLEZogCTwQSbnTEZIIZEHoCdxWftJaddNbreSHUVlPhLTWSAcmdwkgCDASTRLGjClarTYPmTZppYyKJcCmQyKmmFFFvhFsSZevKWKCGcQVUmnbPKiIXGQWyUieQZEgBhqlJhbKkzmMoWZPzsioovcdmKBQNRRHKfBtnaROdYhrXaeA;
    if (token) {
      const decodedUser = await googleAuth(token as string);
      const user = await User.findOne({
        where: {
          email: decodedUser?.email,
        },
      });
      const lecture = await Lecture.findOne({
        where: {
          isHidden: false,
          id: req.params.lectureId,
        },
      });
      const section = await Section.findOne({
        where: {
          id: lecture?.sectionId,
        },
      });
      const enrollments = await Enrollment.findAll({
        where: {
          courseId: section?.courseId,
          learnerId: user?.id,
        },
      });
      const video = await Video.findOne({
        where: {
          lectureId: req.params.lectureId,
        },
      });
      if (enrollments.length) {
        const extension = video?.fileName.split(".")[1];

        const metaDataParams = {
          Bucket: "cnht-main-bucket",
          Key: video?.id + "." + extension,
        };
        const range = req.headers.range;
        const metaData = await s3.headObject(metaDataParams).promise();
        const fileSize = metaData.ContentLength;

        if (range) {
          const parts = range.replace(/bytes=/, "").split("-");
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : fileSize! - 1;
          const chunksize = end - start + 1;

          const head = {
            "Content-Range": `bytes ${start}-${end}/${fileSize}`,
            "Accept-Ranges": "bytes",
            "Content-Length": chunksize,
            "Content-Type": "video/mp4",
          };
          const streamParams = {
            Bucket: "cnht-main-bucket",
            Key: video?.id + "." + extension,
            Range: range,
          };

          res.writeHead(206, head);
          return s3.getObject(streamParams).createReadStream().pipe(res);
        } else {
          const head = {
            "Content-Length": fileSize,
            "Content-Type": "video/mp4",
          };
          res.writeHead(200, head);
          const streamParams = {
            Bucket: "cnht-main-bucket",
            Key: video?.id + "." + extension,
          };
          return s3.getObject(streamParams).createReadStream().pipe(res);
        }
      }
      // Learner not purchase
      else {
        res.status(404).json({
          message: log("Learner not purchase yet"),
        });
      }
    } // If client does not send token
    else {
      res.status(401).json({
        message: log("Permission denied"),
      });
    }
  } catch (error) {
    log(error.message);
    res.status(500).json({
      message: log(error.message),
    });
  }
});

export default router;
