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
import { auth, OAuth2Client } from "google-auth-library";
import { Storage } from "@google-cloud/storage";
import path from "path";
import moment from "moment";

const client = new OAuth2Client(process.env.CLIENT_ID);

// Define router
const router: Router = express.Router();

const fileStorage: { [index: string]: Array<Buffer> } = {};

const storage = new Storage({
  keyFilename: path.join(__dirname, "../key.json"),
  projectId: process.env.PROJECT_ID,
});

const bucket = storage.bucket(process.env.BUCKET!);

// POST method: create new lecture
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
          course.lectureCount += 1;
          await course.save();
          await course.reload();
          const lecture = await Lecture.create({
            title: req.body.title,
            sectionId: req.body.sectionId,
            lectureOrder: course.lectureCount,
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
        } else {
          res.status(404).json({
            message: log("Course not found"),
            count: 1,
            course: null,
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

// PUT method: update a lecture by id
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
          // Save
          await lecture.save();
          // Refresh from database
          await lecture.reload();
          res.status(200).json({
            message: "Update lecture successfully",
            count: 1,
            lecture: lecture,
          });
        } else {
          res.status(500).json({
            message: log("Cannot update lecture"),
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
    audience: [process.env.CLIENT_ID!, process.env.LOCAL_CLIENT_ID!],
  });
  return ticket.getPayload();
};

// POST: upload video
router.post("/:lectureId/video/upload", requireAuth, async (req, res, next) => {
  requireRole([ROLES.ADMIN], req, res, next, async (req, res, next) => {
    try {
      const fileId = req.headers["x-content-id"];
      const chunkSize = Number(req.headers["x-chunk-length"]);
      const chunkId = Number(req.headers["x-chunk-id"]);
      const chunksQuantity = Number(req.headers["x-chunks-quantity"]);
      const originalFileName = req.headers["x-content-name"];
      const fileSize = Number(req.headers["x-content-length"]);

      const file = (fileStorage[fileId as string] =
        fileStorage[fileId as string] || []);
      const chunk: Buffer[] = [];

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
        const extension = (originalFileName as string).split(".")[1];
        const name = (originalFileName as string).split(".")[0];
        const fileInBucket = bucket.file(_id + "." + extension);
        await fileInBucket.save(completeFile);

        const currentVideo = await Video.findOne({
          where: {
            isHidden: false,
            lectureId: req.params.lectureId,
          },
        });
        if (currentVideo) {
          // mark hidden
          currentVideo.isHidden = true;
          await currentVideo.save();
          await currentVideo.reload();

          // create new video to database
          const video = await Video.create({
            id: _id,
            fileName: name + "." + extension,
            size: fileSize,
            lectureId: req.params.lectureId,
          });
          if (video) {
            await video.reload();
            res.status(201).json({
              message: log("Update video successfully"),
              count: 1,
              video: video,
            });
          } else {
            res.status(500).json({
              message: log("Cannot update new video"),
              count: 0,
              video: null,
            });
          }
        } else {
          const video = await Video.create({
            id: _id,
            size: fileSize,
            fileName: name + "." + extension,
            lectureId: req.params.lectureId,
          });
          if (video) {
            await video.reload();
            res.status(201).json({
              message: log("Upload video successfully"),
              count: 1,
              video: video,
            });
          } else {
            res.status(500).json({
              message: log("Cannot upload new video"),
              count: 0,
              video: null,
            });
          }
        }
      } else {
        res.status(200).json({
          message: "Continuing",
        });
      }
    } catch (err) {
      console.log(err.message);
      res.status(500).json({
        message: err.message,
      });
    }
  });
});

// GET method: Get signed url to stream video
router.get("/:lectureId/video/streaming", async (req, res, next) => {
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
          isHidden: false,
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
          isHidden: false,
          lectureId: req.params.lectureId,
        },
      });
      if (enrollments.length) {
        const extension = video?.fileName.split(".")[1];
        const file = bucket.file(video!.id + "." + extension);
        const config = {
          action: "read" as const,
          expires: moment(new Date()).add(1, "day").format("MM-DD-YYYY"),
          accessibleAt: moment(new Date()).format("MM-DD-YYYY"),
        };

        file.getSignedUrl(config, (error, url) => {
          if (error) {
            res.status(500).json({
              message: error.message,
              signedUrl: null,
            });
          } else {
            res.status(200).json({
              message: "Get signed url successfully",
              signedUrl: url,
            });
          }
        });
      }
      // Learner not purchase
      else {
        res.status(401).json({
          message: log("Permission denied"),
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

// PUT method: update length of the video of a lecture
router.put("/:lectureId/video/length", requireAuth, async (req, res, next) => {
  requireRole([ROLES.ADMIN], req, res, next, async (req, res, next) => {
    try {
      const videoModel = await Video.findOne({
        where: {
          isHidden: false,
          lectureId: req.params.lectureId,
        },
      });
      if (videoModel) {
        videoModel.length = req.body.length;
        await videoModel.save();
        await videoModel.reload();
        res.status(200).json({
          message: log("Video update successfully"),
          count: 1,
          video: videoModel,
        });
      } else {
        res.status(404).json({
          message: log("Video not found"),
        });
      }
    } catch (error) {
      res.status(500).json({
        message: log(error.message),
      });
    }
  });
});

// GET method: get video model
router.get("/:lectureId/video", async (req, res, next) => {
  try {
    const videoModel = await Video.findOne({
      where: {
        isHidden: false,
        lectureId: req.params.lectureId,
      },
    });
    if (videoModel) {
      res.status(200).json({
        message: log("Get video model successfully"),
        count: 1,
        video: videoModel,
      });
    } else {
      res.status(404).json({
        message: log("Video model not found"),
        count: 0,
        video: null,
      });
    }
  } catch (error) {
    res.status(500).json({
      message: log(error.message),
      count: 0,
      video: null,
    });
  }
});

// PUT method: move a lecture down
router.put("/:lectureId/down", requireAuth, async (req, res, next) => {
  requireRole([ROLES.ADMIN], req, res, next, async (req, res, next) => {
    const sectionId = req.body.sectionId;
    const lecture = await Lecture.findOne({
      where: {
        isHidden: false,
        id: req.params.lectureId,
      },
    });
    if (lecture) {
      const lectures = await Lecture.findAll({
        where: {
          isHidden: false,
          sectionId: sectionId,
        },
      });
      lectures.sort((a, b) => a.lectureOrder - b.lectureOrder);
      if (lecture.sectionId === sectionId) {
        if (lectures.length) {
          const index = lectures.findIndex((e) => e.id === lecture.id);
          const tempOrder = lecture.lectureOrder;
          lecture.lectureOrder = lectures[index + 1].lectureOrder;
          lectures[index + 1].lectureOrder = tempOrder;
          await lectures[index + 1].save();
          await lectures[index + 1].reload();
          await lecture.save();
          await lecture.reload();
          res.status(200).json({
            message: log("Move lecture down successfully"),
          });
        } else {
          res.status(404).json({
            message: log("No lecture found"),
          });
        }
      } else {
        lecture.sectionId = sectionId;
        await lecture.save();
        await lecture.reload();

        for (let i = 0; i < lectures.length; i++) {
          if (i === 0) {
            if (lecture.lectureOrder > lectures[i].lectureOrder) {
              const tempOrder = lectures[i].lectureOrder;
              lectures[i].lectureOrder = lecture.lectureOrder;
              lecture.lectureOrder = tempOrder;
              await lectures[i].save();
              await lectures[i].reload();
              await lecture.save();
              await lecture.reload();
            } else {
              break;
            }
          } else {
            if (lectures[i].lectureOrder < lectures[i - 1].lectureOrder) {
              const tempOrder = lectures[i].lectureOrder;
              lectures[i].lectureOrder = lectures[i - 1].lectureOrder;
              lectures[i - 1].lectureOrder = tempOrder;
              await lectures[i].save();
              await lectures[i].reload();
              await lectures[i - 1].save();
              await lectures[i - 1].reload();
            } else {
              break;
            }
          }
        }
        res.status(200).json({
          message: log("Move lecture down successfully"),
        });
      }
    } else {
      res.status(404).json({
        message: log("No lecture found"),
      });
    }
  });
});

// PUT method: move a lecture up
router.put("/:lectureId/up", requireAuth, async (req, res, next) => {
  requireRole([ROLES.ADMIN], req, res, next, async (req, res, next) => {
    const sectionId = req.body.sectionId;
    const lecture = await Lecture.findOne({
      where: {
        isHidden: false,
        id: req.params.lectureId,
      },
    });
    if (lecture) {
      const lectures = await Lecture.findAll({
        where: {
          isHidden: false,
          sectionId: sectionId,
        },
      });
      lectures.sort((a, b) => a.lectureOrder - b.lectureOrder);
      if (lecture.sectionId === sectionId) {
        if (lectures.length) {
          const index = lectures.findIndex((e) => e.id === lecture.id);
          const tempOrder = lecture.lectureOrder;
          lecture.lectureOrder = lectures[index - 1].lectureOrder;
          lectures[index - 1].lectureOrder = tempOrder;
          await lectures[index - 1].save();
          await lectures[index - 1].reload();
          await lecture.save();
          await lecture.reload();
          res.status(200).json({
            message: log("Move lecture up successfully"),
          });
        } else {
          res.status(404).json({
            message: log("No lecture found"),
          });
        }
      } else {
        lecture.sectionId = sectionId;
        await lecture.save();
        await lecture.reload();

        for (let i = lectures.length - 1; i >= 0; i--) {
          if (i === lectures.length - 1) {
            if (lecture.lectureOrder < lectures[i].lectureOrder) {
              const tempOrder = lectures[i].lectureOrder;
              lectures[i].lectureOrder = lecture.lectureOrder;
              lecture.lectureOrder = tempOrder;
              await lectures[i].save();
              await lectures[i].reload();
              await lecture.save();
              await lecture.reload();
            } else {
              break;
            }
          } else {
            if (lectures[i].lectureOrder > lectures[i + 1].lectureOrder) {
              const tempOrder = lectures[i].lectureOrder;
              lectures[i].lectureOrder = lectures[i + 1].lectureOrder;
              lectures[i + 1].lectureOrder = tempOrder;
              await lectures[i].save();
              await lectures[i].reload();
              await lectures[i + 1].save();
              await lectures[i + 1].reload();
            } else {
              break;
            }
          }
        }
        res.status(200).json({
          message: log("Move lecture up successfully"),
        });
      }
    } else {
      res.status(404).json({
        message: log("No lecture found"),
      });
    }
  });
});

export default router;
