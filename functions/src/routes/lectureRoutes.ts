import express, { Router, Request, Response, NextFunction } from "express";
import { log, momentFormat } from "../utils";
import { ROLES } from "../types";
import requireAuth from "../middleware/requireAuth";
import requireRole from "../middleware/requireRole";
import { v4 as uuidv4 } from "uuid";
import { auth, OAuth2Client } from "google-auth-library";
import { Storage } from "@google-cloud/storage";
import path from "path";
import moment from "moment";
import db from "../database/firestoreConnection";

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
        const courseSnapshot = await db
          .collection("courses")
          .where("isHidden", "==", false)
          .where("id", "==", req.body.courseId)
          .get();
        if (courseSnapshot.docs.length) {
          const updatedAt = momentFormat();
          const createdAt = momentFormat();
          const course = courseSnapshot.docs[0].data();
          await db
            .collection("courses")
            .doc(course.id)
            .update({
              lectureCount: course.lectureCount + 1,
              updatedAt: updatedAt,
            });
          const id = uuidv4();
          const lecture = await db.collection("lectures").doc(id).set({
            id: id,
            title: req.body.title,
            sectionId: req.body.sectionId,
            lectureOrder: course.lectureCount,
            note: "",
            isHidden: false,
            createdAt: createdAt,
            updatedAt: updatedAt,
          });
          if (lecture) {
            res.status(201).json({
              message: log("Create new lecture successfully"),
              count: 1,
              lecture: {
                id: id,
                title: req.body.title,
                sectionId: req.body.sectionId,
                lectureOrder: course.lectureCount,
                note: req.body.note,
                isHidden: false,
                createdAt: createdAt,
                updatedAt: updatedAt,
              },
            });
          } else {
            res.status(500).json({
              message: log("Cannot create lecture"),
              count: 0,
              lecture: null,
              course: null,
            });
          }
        } else {
          res.status(404).json({
            message: log("Course not found"),
            count: 1,
            course: null,
            lecture: null,
          });
        }
      } catch (error) {
        log(error.message);
        res.status(500).json({
          message: log(error.message),
          count: 0,
          lecture: null,
          course: null,
        });
      }
    });
  }
);

// GET method: get lectures by filters
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const snapshot = await db
      .collection("lectures")
      .where("isHidden", "==", false)
      .get();
    let lectures = snapshot.docs.map((lecture) => lecture.data());
    const id = req.query.id;
    const title = req.query.title;
    const sectionId = req.query.sectionId;

    if (id) {
      lectures = lectures.filter((lecture) => lecture.id === id);
    }
    if (title) {
      lectures = lectures.filter((lecture) =>
        lecture.title.toLowerCase().includes((title as string).toLowerCase())
      );
    }
    if (sectionId) {
      lectures = lectures.filter((lecture) => lecture.sectionId == sectionId);
    }
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
        const lectureId = req.params.id;
        const snapshot = await db
          .collection("lectures")
          .where("isHidden", "==", false)
          .where("id", "==", lectureId)
          .get();
        if (snapshot.docs.length) {
          const updatedAt = momentFormat();
          const lecture = snapshot.docs[0].data();
          await db.collection("lectures").doc(lecture.id).update({
            title: req.body.title,
            note: req.body.note,
            updatedAt: updatedAt,
          });
          lecture.title = req.body.title;
          lecture.sectionId = req.body.sectionId;
          lecture.lectureOrder = req.body.lectureOrder;
          lecture.note = req.body.note;
          lecture.updatedAt = updatedAt;
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
        const lectureId = req.params.id;
        const snapshot = await db
          .collection("lectures")
          .where("isHidden", "==", false)
          .where("id", "==", lectureId)
          .get();
        if (snapshot.docs.length) {
          const lecture = snapshot.docs[0].data();
          const updatedAt = momentFormat();
          await db.collection("lectures").doc(lecture.id).update({
            isHidden: true,
            updatedAt: updatedAt,
          });
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
    audience: [
      process.env.CLIENT_ID!,
      process.env.LOCAL_CLIENT_ID!,
      process.env.DEV_CLIENT_ID!,
    ],
  });
  return ticket.getPayload();
};

// POST: upload video
router.post("/:lectureId/video/upload", requireAuth, async (req, res, next) => {
  requireRole([ROLES.ADMIN], req, res, next, async (req, res, next) => {
    try {
      console.log("initializing");
      const lectureId = req.params.lectureId;
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

        const snapshot = await db
          .collection("videos")
          .where("isHidden", "==", false)
          .where("lectureId", "==", lectureId)
          .get();
        const createdAt = momentFormat();
        const updatedAt = momentFormat();
        if (snapshot.docs.length) {
          const currentVideo = snapshot.docs[0].data();

          await db.collection("videos").doc(currentVideo.id).update({
            isHidden: true,
            updatedAt: updatedAt,
          });
          const video = await db
            .collection("videos")
            .doc(_id)
            .set({
              id: _id,
              fileName: name + "." + extension,
              size: fileSize,
              lectureId: lectureId,
              isHidden: false,
              createdAt: createdAt,
              updatedAt: updatedAt,
            });
          if (video) {
            res.status(201).json({
              message: log("Update video successfully"),
              count: 1,
              video: {
                id: _id,
                fileName: name + "." + extension,
                size: fileSize,
                lectureId: lectureId,
                isHidden: false,
                createdAt: createdAt,
                updatedAt: updatedAt,
              },
            });
          } else {
            res.status(500).json({
              message: log("Cannot update new video"),
              count: 0,
              video: null,
            });
          }
        } else {
          const video = await db
            .collection("videos")
            .doc(_id)
            .set({
              id: _id,
              fileName: name + "." + extension,
              size: fileSize,
              lectureId: lectureId,
              isHidden: false,
              createdAt: createdAt,
              updatedAt: updatedAt,
            });
          if (video) {
            res.status(201).json({
              message: log("Upload video successfully"),
              count: 1,
              video: {
                id: _id,
                fileName: name + "." + extension,
                size: fileSize,
                lectureId: lectureId,
                isHidden: false,
                createdAt: createdAt,
                updatedAt: updatedAt,
              },
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
    const lectureId = req.params.lectureId;
    const token =
      req.query
        .RGhqHqXSZfjAiyXgzznYnHSKRvxiHBWvzLZFZTUxXhRjvqsagFwHzfXuQPWcTQALWHqGKUPBFmuLWmKavtRvBWriLgXWtCAuDrsukwgTBQfuPVOiSeWtLbNTgSjtgYtICvCzYSmxwIXGeurxyOcGlrjvcDaAIsDIBDziWipcZbBPVUlzwhnpvjPrVHghlOppHdRUxctaGRUcBQXUJutPBhNSzebikzpytuIADtOEswqcJxZsBvkwvDayDXrofHfpxOrYzTXLSvZTkXodWNimYNiTAlFywOcRFMFSaNYOQAsxsHiDFxnvwFHkwMivNjJqAalJaUqmUDHkrWnGWnPLEZogCTwQSbnTEZIIZEHoCdxWftJaddNbreSHUVlPhLTWSAcmdwkgCDASTRLGjClarTYPmTZppYyKJcCmQyKmmFFFvhFsSZevKWKCGcQVUmnbPKiIXGQWyUieQZEgBhqlJhbKkzmMoWZPzsioovcdmKBQNRRHKfBtnaROdYhrXaeA;
    if (token) {
      const decodedUser = await googleAuth(token as string);

      const userSnapshot = await db
        .collection("users")
        .where("isHidden", "==", false)
        .where("email", "==", decodedUser?.email)
        .get();
      if (userSnapshot.docs.length) {
        const user = userSnapshot.docs[0].data();
        const lectureSnapshot = await db
          .collection("lectures")
          .where("isHidden", "==", false)
          .where("id", "==", lectureId)
          .get();
        if (lectureSnapshot.docs.length) {
          const lecture = lectureSnapshot.docs[0].data();
          const sectionSnapshot = await db
            .collection("sections")
            .where("isHidden", "==", false)
            .where("id", "==", lecture.sectionId)
            .get();
          if (sectionSnapshot.docs.length) {
            const section = sectionSnapshot.docs[0].data();
            const enrollmentsSnapshot = await db
              .collection("enrollments")
              .where("isHidden", "==", false)
              .where("courseId", "==", section?.courseId)
              .where("learnerId", "==", user?.id)
              .get();
            if (enrollmentsSnapshot.docs.length) {
              const enrollments = enrollmentsSnapshot.docs[0].data();
              const videoSnapshot = await db
                .collection("videos")
                .where("isHidden", "==", false)
                .where("lectureId", "==", lectureId)
                .get();
              if (videoSnapshot.docs.length) {
                const video = videoSnapshot.docs[0].data();
                if (enrollments) {
                  const extension = video?.fileName.split(".")[1];
                  const file = bucket.file(video!.id + "." + extension);
                  const config = {
                    action: "read" as const,
                    expires: moment(new Date())
                      .add(1, "day")
                      .format("MM-DD-YYYY"),
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
                } else {
                  res.status(404).json({
                    message: log("Enrollment not found"),
                  });
                }
              } else {
                res.status(404).json({
                  message: "Video not found",
                  signedUrl: null,
                });
              }
            } else if (user.userRole == "admin") {
              const videoSnapshot = await db
                .collection("videos")
                .where("isHidden", "==", false)
                .where("lectureId", "==", lectureId)
                .get();
              if (videoSnapshot.docs.length) {
                const video = videoSnapshot.docs[0].data();
                const extension = video?.fileName.split(".")[1];
                const file = bucket.file(video!.id + "." + extension);
                const config = {
                  action: "read" as const,
                  expires: moment(new Date())
                    .add(1, "day")
                    .format("MM-DD-YYYY"),
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
              } else {
                res.status(404).json({
                  message: "Video not found",
                  signedUrl: null,
                });
              }
            } else {
              res.status(404).json({
                message: "Enrollment not found",
                signedUrl: null,
              });
            }
          } else {
            res.status(404).json({
              message: "Section not found",
              signedUrl: null,
            });
          }
        } else {
          res.status(404).json({
            message: "Lecture not found",
            signedUrl: null,
          });
        }
      } else {
        res.status(404).json({
          message: "User not found",
          signedUrl: null,
        });
      }
    } else {
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
      const lectureId = req.params.lectureId;
      const snapshot = await db
        .collection("videos")
        .where("isHidden", "==", false)
        .where("lectureId", "==", lectureId)
        .get();

      if (snapshot.docs.length) {
        const videoModel = snapshot.docs[0].data();
        const updatedAt = momentFormat();
        await db
          .collection("videos")
          .doc(videoModel.id)
          .update({
            length: Math.round(req.body.length),
            updatedAt: updatedAt,
          });
        videoModel.length = Math.round(req.body.length);
        videoModel.updatedAt = updatedAt;
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

// GET method: get video model by lecture id
router.get("/:lectureId/video", async (req, res, next) => {
  try {
    const snapshot = await db
      .collection("videos")
      .where("isHidden", "==", false)
      .where("lectureId", "==", req.params.lectureId)
      .get();
    if (snapshot.docs.length) {
      const videoModel = snapshot.docs[0].data();
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
    const updatedAt = momentFormat();
    const sectionId = req.body.sectionId;
    const snapshot = await db
      .collection("lectures")
      .where("isHidden", "==", false)
      .where("id", "==", req.params.lectureId)
      .get();
    if (snapshot.docs.length) {
      const lecture = snapshot.docs[0].data();
      const lecturesSnapshot = await db
        .collection("lectures")
        .where("isHidden", "==", false)
        .where("sectionId", "==", sectionId)
        .get();
      if (lecturesSnapshot.docs.length) {
        const lectures = lecturesSnapshot.docs.map((lecture) => lecture.data());
        lectures.sort((a, b) => a.lectureOrder - b.lectureOrder);

        if (lecture.sectionId === sectionId) {
          if (
            lectures.findIndex((l) => l.id === lecture.id) ===
            lectures.length - 1
          ) {
            res.status(400).json({
              message: "This lecture is already on bottom, cannot move down",
            });
          } else {
            if (lectures.length) {
              const index = lectures.findIndex((e) => e.id === lecture.id);
              const tempOrder = lecture.lectureOrder;
              await db
                .collection("lectures")
                .doc(lecture.id)
                .update({
                  lectureOrder: lectures[index + 1].lectureOrder,
                  updatedAt: updatedAt,
                });
              await db
                .collection("lectures")
                .doc(lectures[index + 1].id)
                .update({
                  lectureOrder: tempOrder,
                  updatedAt: updatedAt,
                });
              res.status(200).json({
                message: log("Move lecture down successfully"),
              });
            } else {
              res.status(404).json({
                message: log("No lecture found"),
              });
            }
          }
        } else {
          await db.collection("lectures").doc(lecture.id).update({
            sectionId: sectionId,
            updatedAt: updatedAt,
          });
          for (let i = 0; i < lectures.length; i++) {
            if (i === 0) {
              if (lecture.lectureOrder > lectures[i].lectureOrder) {
                const tempOrder = lectures[i].lectureOrder;
                await db.collection("lectures").doc(lectures[i].id).update({
                  lectureOrder: lecture.lectureOrder,
                  updatedAt: updatedAt,
                });
                await db.collection("lectures").doc(lecture.id).update({
                  lectureOrder: tempOrder,
                  updatedAt: updatedAt,
                });
              } else {
                break;
              }
            } else {
              if (lectures[i].lectureOrder < lectures[i - 1].lectureOrder) {
                const tempOrder = lectures[i].lectureOrder;
                await db
                  .collection("lectures")
                  .doc(lectures[i].id)
                  .update({
                    lectureOrder: lectures[i - 1].lectureOrder,
                    updatedAt: updatedAt,
                  });
                await db
                  .collection("lectures")
                  .doc(lectures[i - 1].id)
                  .update({
                    lectureOrder: tempOrder,
                    updatedAt: updatedAt,
                  });
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
          message: "No lecture found",
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
    const updatedAt = momentFormat();
    const sectionId = req.body.sectionId;
    const snapshot = await db
      .collection("lectures")
      .where("isHidden", "==", false)
      .where("id", "==", req.params.lectureId)
      .get();
    if (snapshot.docs.length) {
      const lecture = snapshot.docs[0].data();
      const lecturesSnapshot = await db
        .collection("lectures")
        .where("isHidden", "==", false)
        .where("sectionId", "==", sectionId)
        .get();
      const lectures = lecturesSnapshot.docs.map((lecture) => lecture.data());
      lectures.sort((a, b) => a.lectureOrder - b.lectureOrder);
      if (lecture.sectionId === sectionId) {
        if (lectures.findIndex((l) => l.id === lecture.id) === 0) {
          res.status(400).json({
            message: "This lecture is already on top, cannot move up",
          });
        } else {
          if (lectures.length) {
            const index = lectures.findIndex((e) => e.id === lecture.id);
            const tempOrder = lecture.lectureOrder;
            await db
              .collection("lectures")
              .doc(lecture.id)
              .update({
                lectureOrder: lectures[index - 1].lectureOrder,
                updatedAt: updatedAt,
              });
            await db
              .collection("lectures")
              .doc(lectures[index - 1].id)
              .update({
                lectureOrder: tempOrder,
                updatedAt: updatedAt,
              });
            res.status(200).json({
              message: log("Move lecture up successfully"),
            });
          } else {
            res.status(404).json({
              message: log("No lecture found"),
            });
          }
        }
      } else {
        await db.collection("lectures").doc(lecture.id).update({
          sectionId: sectionId,
          updatedAt: updatedAt,
        });

        for (let i = lectures.length - 1; i >= 0; i--) {
          if (i === lectures.length - 1) {
            if (lecture.lectureOrder < lectures[i].lectureOrder) {
              const tempOrder = lectures[i].lectureOrder;
              await db.collection("lectures").doc(lecture[i].id).update({
                lectureOrder: lecture.lectureOrder,
                updatedAt: updatedAt,
              });
              await db.collection("lectures").doc(lecture.id).update({
                lectureOrder: tempOrder,
                updatedAt: updatedAt,
              });
            } else {
              break;
            }
          } else {
            if (lectures[i].lectureOrder > lectures[i + 1].lectureOrder) {
              const tempOrder = lectures[i].lectureOrder;
              await db
                .collection("lectures")
                .doc(lecture[i].id)
                .update({
                  lectureOrder: lectures[i + 1].lectureOrder,
                  updatedAt: updatedAt,
                });
              await db
                .collection("lectures")
                .doc(lecture[i + 1].id)
                .update({
                  lectureOrder: tempOrder,
                  updatedAt: updatedAt,
                });
              lectures[i + 1].lectureOrder = tempOrder;
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
