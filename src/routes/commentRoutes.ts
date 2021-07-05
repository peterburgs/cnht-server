import express, { Router, Request, Response, NextFunction } from "express";
import { log } from "../utils";
import { ROLES } from "../types";
import { Op } from "sequelize";
import requireAuth from "../middleware/requireAuth";
import requireRole from "../middleware/requireRole";
import Comment from "../models/comment";

// Define router
const router: Router = express.Router();

// POST method: create new comment
router.post(
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
          const comment = await Comment.create({
            commentText: req.body.commentText,
            parentId: req.body.parentId,
            userId: req.body.userId,
            lectureId: req.body.lectureId,
            isHidden: req.body.isHidden,
          });
          if (comment) {
            await comment.reload();
            res.status(201).json({
              message: log("Create new comment successfully"),
              count: 1,
              comment: comment,
            });
          } else {
            res.status(500).json({
              message: log("Cannot create comment"),
              count: 0,
              comment: null,
            });
          }
        } catch (error) {
          log(error.message);
          res.status(500).json({
            message: log(error.message),
            count: 0,
            comment: null,
          });
        }
      }
    );
  }
);

// GET method: get comments by filters
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Create filter from request query
    let reqParams: { [key: string]: string }[] = [];
    for (let [key, value] of Object.entries(req.query)) {
      reqParams.push({ [key]: String(value) });
    }

    // Find comments from filter
    const comments = await Comment.findAll({
      where: {
        isHidden: false,
        [Op.and]: reqParams,
      },
    });
    if (comments.length) {
      res.status(200).json({
        message: log("comments found"),
        count: comments.length,
        comments: comments,
      });
    } else {
      res.status(404).json({
        message: log("No comments found"),
        count: 0,
        comments: [],
      });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).json({
      message: log("No comments found"),
      count: 0,
      comments: [],
    });
  }
});

// DELETE method: delete a comment
router.delete(
  "/:id",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    requireRole(
      [ROLES.ADMIN, ROLES.LEARNER],
      req,
      res,
      next,
      async (req, res, next) => {
        try {
          // Find lecture by id
          let comment = await Comment.findByPk(req.params.id);
          if (comment) {
            // Mark as hidden
            comment.isHidden = true;
            // Save
            await comment.save();
            // Refresh from database
            await comment.reload();
            res.status(200).json({
              message: log("Delete comment successfully"),
            });
          } else {
            res.status(404).json({
              message: log("comment not found"),
            });
          }
        } catch (error) {
          log(error.message);
          res.status(500).json({
            message: log(error.message),
          });
        }
      }
    );
  }
);

export default router;
