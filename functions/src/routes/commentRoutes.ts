import express, { Router, Request, Response, NextFunction } from "express";
import { log, momentFormat } from "../utils";
import { ROLES } from "../types";
import requireAuth from "../middleware/requireAuth";
import requireRole from "../middleware/requireRole";
import db from "../database/firestoreConnection";
import { v4 as uuidv4 } from "uuid";

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
          const id = uuidv4();
          const createdAt = momentFormat();
          const updatedAt = momentFormat();
          const comment = await db.collection("comments").doc(id).set({
            id: id,
            commentText: req.body.commentText,
            parentId: req.body.parentId,
            userId: req.body.userId,
            lectureId: req.body.lectureId,
            isHidden: false,
            createdAt: createdAt,
            updatedAt: updatedAt,
          });

          if (comment) {
            res.status(201).json({
              message: log("Create new comment successfully"),
              count: 1,
              comment: {
                id: id,
                commentText: req.body.commentText,
                parentId: req.body.parentId,
                userId: req.body.userId,
                lectureId: req.body.lectureId,
                isHidden: false,
                createdAt: createdAt,
                updatedAt: updatedAt,
              },
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
          const lectureId = req.query.lectureId;
          const snapshot = await db
            .collection("comments")
            .where("isHidden", "==", false)
            .get();
          if (snapshot.docs.length) {
            let comments = snapshot.docs.map((comment) => comment.data());
            if (lectureId) {
              comments = comments.filter(
                (comment) => comment.lectureId == lectureId
              );
            }
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
      }
    );
  }
);

// DELETE method: delete a comment
router.delete(
  "/:id",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    requireRole([ROLES.ADMIN], req, res, next, async (req, res, next) => {
      try {
        const updatedAt = momentFormat();
        const commentId = req.params.id;
        const snapshot = await db
          .collection("comments")
          .where("isHidden", "==", false)
          .where("id", "==", commentId)
          .get();
        if (snapshot.docs.length) {
          await db.collection("comments").doc(commentId).update({
            isHidden: true,
            updatedAt: updatedAt,
          });
          const childrenCommentSnapshot = await db
            .collection("comments")
            .where("isHidden", "==", false)
            .where("parentId", "==", commentId)
            .get();

          if (childrenCommentSnapshot.docs.length) {
            const childrenComments = childrenCommentSnapshot.docs.map((child) =>
              child.data()
            );
            for (let i = 0; i < childrenComments.length; i++) {
              await db
                .collection("comments")
                .doc(childrenComments[i].id)
                .update({
                  isHidden: true,
                  updatedAt: updatedAt,
                });
            }
            res.status(200).json({
              message: log("Delete comments successfully"),
            });
          } else {
            res.status(404).json({
              message: log("Delete comments successfully"),
            });
          }
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
    });
  }
);

export default router;
