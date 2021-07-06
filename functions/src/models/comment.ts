import Sequelize, { Model } from "sequelize";
import sequelize from "../database/connection";
import { ROLES, Course, COURSE_TYPE, GRADES, Comment } from "../types";

interface CommentInstance extends Model<any, any>, Comment {}

// Define model
const commentModel = sequelize.define<CommentInstance>(
  "Comment",
  {
    id: {
      primaryKey: true,
      type: Sequelize.STRING(255),
      defaultValue: Sequelize.UUIDV4,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
      },
    },
    commentText: {
      type: Sequelize.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: "Comment cannot be empty" },
      },
    },
    parentId: {
      type: Sequelize.STRING(255),
      allowNull: true,
    },
    userId: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    lectureId: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    isHidden: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  { timestamps: true }
);

export default commentModel;
