import express, { Router, Request, Response, NextFunction } from "express";
import { log } from "../utils";
import { ROLES, STATUSES } from "../types";
import { Op, Model } from "sequelize";
import requireAuth from "../middleware/requireAuth";
import requireRole from "../middleware/requireRole";
import DepositRequest from "../models/depositRequest";
import { v4 as uuidv4 } from "uuid";
import { Storage } from "@google-cloud/storage";
import path from "path";

// Define router
const router: Router = express.Router();

const storage = new Storage({
  keyFilename: path.join(__dirname, "../key.json"),
  projectId: process.env.PROJECT_ID,
});

const bucket = storage.bucket(process.env.BUCKET!);

const fileStorage: { [index: string]: Array<Buffer> } = {};

// POST: upload deposit request image
router.post(
  "/:depositRequestId/upload",
  requireAuth,
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
        const fileInBucket = bucket.file(_id + "." + extension);
        await fileInBucket.save(completeFile);

        const depositRequest = await DepositRequest.findOne({
          where: {
            id: req.params.depositRequestId,
          },
        });
        if (depositRequest) {
          depositRequest.imageUrl = `/api/deposit-requests/images/${_id}.${extension}`;
          await depositRequest.save();
          return res.status(201).json({
            message: "Image uploaded",
            depositRequest: depositRequest,
          });
        } else {
          return res
            .status(404)
            .json({ message: "Cannot find deposit request" });
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
  }
);

// GET method: get image of a deposit request
router.get("/images/:key", async (req, res, next) => {
  try {
    const file = bucket.file(req.params.key);
    return file.createReadStream().pipe(res);
  } catch (error) {
    log(error.message);
    res.status(500).json({
      message: log(error.message),
    });
  }
});

// POST method: create new deposit request
router.post(
  "/",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    requireRole([ROLES.LEARNER], req, res, next, async (req, res, next) => {
      try {
        const depositRequest = await DepositRequest.create({
          learnerId: req.body.learnerId,
          amount: req.body.amount,
        });
        if (depositRequest) {
          await depositRequest.reload();
          res.status(201).json({
            message: log("Create new deposit request successfully"),
            count: 1,
            depositRequest: depositRequest,
          });
        } else {
          res.status(500).json({
            message: log("Cannot create deposit request"),
            count: 0,
            depositRequest: null,
          });
        }
      } catch (error) {
        log(error.message);
        res.status(500).json({
          message: log(error.message),
          count: 0,
          depositRequest: null,
        });
      }
    });
  }
);

// GET method: get depositRequests by filters
router.get(
  "/",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    requireRole(
      [ROLES.ADMIN, ROLES.LEARNER],
      req,
      res,
      next,
      async (req, res, next) => {
        try {
          // Create filter from request query
          let reqParams: { [key: string]: string }[] = [];
          for (let [key, value] of Object.entries(req.query)) {
            reqParams.push({ [key]: String(value) });
          }

          // Find deposits from filter
          const depositRequests = await DepositRequest.findAll({
            where: {
              [Op.and]: reqParams,
            },
          });
          if (depositRequests.length) {
            res.status(200).json({
              message: log("Deposit requests found"),
              count: depositRequests.length,
              depositRequests: depositRequests,
            });
          } else {
            res.status(404).json({
              message: log("No deposit requests found"),
              count: 0,
              depositRequests: [],
            });
          }
        } catch (error) {
          console.log(error.message);
          res.status(500).json({
            message: log("No deposit requests found"),
            count: 0,
            depositRequests: [],
          });
        }
      }
    );
  }
);
// PUT method: update a deposit request by PK

router.put(
  "/:id",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    requireRole([ROLES.ADMIN], req, res, next, async (req, res, next) => {
      try {
        // Find course by id
        let depositRequest = await DepositRequest.findByPk(req.params.id);
        if (depositRequest) {
          // Update
          depositRequest.depositRequestStatus = req.body.depositRequestStatus;
          // Save
          await depositRequest.save();
          // Refresh from database
          await depositRequest.reload();
          res.status(200).json({
            message: log("Update deposit request successfully"),
            count: 1,
            depositRequest: depositRequest,
          });
        } else {
          res.status(404).json({
            message: log("Deposit request not found"),
            count: 0,
            depositRequest: null,
          });
        }
      } catch (error) {
        log(error.message);
        res.status(500).json({
          message: log(error.message),
          count: 0,
          depositRequest: null,
        });
      }
    });
  }
);

export default router;
