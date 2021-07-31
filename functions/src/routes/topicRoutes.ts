import express, { Router, Request, Response, NextFunction } from "express";
import { log, momentFormat } from "../utils";
import { Lecture, ROLES, Course, Section, Video, TOPICS } from "../types";
import requireAuth from "../middleware/requireAuth";
import requireRole from "../middleware/requireRole";
import { v4 as uuidv4 } from "uuid";
import { Storage } from "@google-cloud/storage";
import path from "path";
import db from "../database/firestoreConnection";

// Define router
const router: Router = express.Router();

const storage = new Storage({
  keyFilename: path.join(__dirname, "../key.json"),
  projectId: process.env.PROJECT_ID,
});
const bucket = storage.bucket(process.env.BUCKET!);
const fileStorage: { [index: string]: Array<Buffer> } = {};

// POST method: create new topic
router.post(
  "/",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    requireRole([ROLES.ADMIN], req, res, next, async (req, res, next) => {
      try {
        const createdAt = momentFormat();
        const updatedAt = momentFormat();
        const topicId = uuidv4();
        const topic = await db.collection("topics").doc(topicId).set({
          id: topicId,
          title: req.body.title,
          fileUrl: req.body.fileUrl,
          topicType: req.body.topicType,
          isHidden: false,
          createdAt: createdAt,
          updatedAt: updatedAt,
        });
        if (topic) {
          res.status(201).json({
            message: log("Create new topic successfully"),
            count: 1,
            topic: {
              id: topicId,
              title: req.body.title,
              fileUrl: req.body.fileUrl,
              topicType: req.body.topicType,
              isHidden: false,
              createdAt: createdAt,
              updatedAt: updatedAt,
            },
          });
        } else {
          res.status(500).json({
            message: log("Cannot create topic"),
            count: 0,
            topic: null,
          });
        }
      } catch (error) {
        log(error.message);
        res.status(500).json({
          message: log(error.message),
          count: 0,
          topic: null,
        });
      }
    });
  }
);

// GET method: get topics by filters
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const snapshot = await db
      .collection("topics")
      .where("isHidden", "==", false)
      .get();
    if (snapshot.docs.length) {
      let topics = snapshot.docs.map((doc) => doc.data());
      const topicId = req.query.topicId;
      const topicTitle = req.query.topicTitle;
      const topicType = req.query.topicType;
      if (topicId) {
        topics = topics.filter((topic) => topic.id === topicId);
      }
      if (topicTitle) {
        topics = topics.filter((topic) =>
          topic.topicTitle.includes(topicTitle)
        );
      }
      if (topicType) {
        topics = topics.filter((topic) => topic.topicType == topicType);
      }
      if (topics.length) {
        res.status(200).json({
          message: log("Topics found"),
          count: topics.length,
          topics: topics,
        });
      } else {
        res.status(404).json({
          message: log("No topic found"),
          count: 0,
          topics: [],
        });
      }
    } else {
      res.status(404).json({
        message: "Cannot find topic",
        count: 0,
        topics: null,
      });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).json({
      message: log("No topics found"),
      count: 0,
      topics: [],
    });
  }
});

// PUT method: update a topic by id
router.put(
  "/:id",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    requireRole([ROLES.ADMIN], req, res, next, async (req, res, next) => {
      try {
        const topicId = req.params.id;
        let snapshot = await db
          .collection("topics")
          .where("id", "==", topicId)
          .get();
        if (snapshot.docs.length) {
          const updatedAt = momentFormat();
          const update = await db.collection("topics").doc(topicId).update({
            title: req.body.title,
            fileUrl: req.body.fileUrl,
            topicType: req.body.topicType,
            updatedAt: updatedAt,
          });
          if (update) {
            let topic = snapshot.docs[0].data();
            topic.updatedAt = updatedAt;
            topic.title = req.body.title;
            topic.fileUrl = req.body.fileUrl;
            topic.topicType = req.body.topicType;
            res.status(200).json({
              message: log("Update topic successfully"),
              count: 1,
              topic: topic,
            });
          } else {
            res.status(500).json({
              message: log("Cannot update topic"),
              count: 0,
              topic: null,
            });
          }
        } else {
          res.status(404).json({
            message: log("Topic not found"),
            count: 0,
            topic: null,
          });
        }
      } catch (error) {
        log(error.message);
        res.status(500).json({
          message: log(error.message),
          count: 0,
          topic: null,
        });
      }
    });
  }
);

// DELETE method: delete a topic
router.delete(
  "/:id",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    requireRole([ROLES.ADMIN], req, res, next, async (req, res, next) => {
      try {
        const topicId = req.params.id;
        let snapshot = await db
          .collection("topics")
          .where("id", "==", topicId)
          .get();
        if (snapshot.docs.length) {
          const updatedAt = momentFormat();
          const deletedTopic = await db
            .collection("topics")
            .doc(topicId)
            .update({
              isHidden: true,
              updatedAt: updatedAt,
            });
          if (deletedTopic) {
            res.status(200).json({
              message: log("Delete topic successfully"),
            });
          } else {
            res.status(500).json({
              message: log("Cannot delete topic"),
            });
          }
        } else {
          res.status(404).json({
            message: log("Topic not found"),
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

// POST method: upload pdf file
router.post(
  "/:id/files/upload",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    requireRole([ROLES.ADMIN], req, res, next, async (req, res, next) => {
      const topicId = req.params.id;
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
            .collection("topics")
            .where("isHidden", "==", false)
            .where("id", "==", topicId)
            .get();
          if (snapshot.docs.length) {
            const updatedTopic = await db
              .collection("topics")
              .doc(topicId)
              .update({
                fileUrl: `/api/topics/files/${_id}.${extension}`,
                fileName: fileName,
                updatedAt: momentFormat(),
              });
            if (updatedTopic) {
              return res.status(201).json({
                message: "File uploaded",
              });
            } else {
              return res.status(500).json({
                message: "File cannot be uploaded",
              });
            }
          } else {
            return res.status(404).json({ message: "Cannot find topic" });
          }
        } else {
          res.status(200).json({
            message: "Continuing",
          });
        }
      } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Cannot upload file" });
      }
    });
  }
);

// GET method: get pdf file of a topic
router.get("/files/:key", async (req, res, next) => {
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

export default router;
