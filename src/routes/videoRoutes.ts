import express, { Router, Request, Response, NextFunction } from "express";
import { log } from "../utils";
import { ROLES } from "../types";
import { Op, Model } from "sequelize";
import requireAuth from "../middleware/requireAuth";
import requireRole from "../middleware/requireRole";
import AWS from "aws-sdk";
import Enrollment from "../models/enrollment";
import Video from "../models/video";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";

// Config multer
import multer from "multer";
const upload = multer({
  dest: "../assets/videos",
});
// Define router
const router: Router = express.Router();
// Config aws
const ep = new AWS.Endpoint("s3.wasabisys.com");
const s3 = new AWS.S3({ endpoint: ep });

router.post(
  "/",
  upload.single("video"),
  requireAuth,
  async (req, res, next) => {
    requireRole([ROLES.ADMIN], req, res, next, async (req, res, next) => {
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
          const metadataParams = {
            Bucket: "cnht-main-bucket",
            Key: _id + "." + extension,
          };
          const metadata = await s3.headObject(metadataParams).promise();
          const metadataContentLength = metadata.ContentLength;
          const video = await Video.create({
            id: _id,
            fileName: fileName + "." + extension,
            length: metadataContentLength,
            lectureId: req.body.lectureId,
            isHidden: req.body.isHidden,
          });
          if (video) {
            await video.reload();
            res.status(201).json({
              message: log("Create new video successfully"),
              count: 1,
              video: video,
            });
          } else {
            res.status(500).json({
              message: log("Cannot create new video"),
              count: 0,
              video: null,
            });
          }
        } catch (error) {
          log(error.message);
          res.status(500).json({
            message: log(error.message),
          });
        }
      } else {
        res.status(404).json({
          message: log("Video not found"),
          count: 0,
          video: null,
        });
      }
    });
  }
);

export default router;
