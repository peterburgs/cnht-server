import Sequelize, { Model } from "sequelize";
import { ROLES, Course, COURSE_TYPE, GRADES, Comment, Video } from "../types";

interface VideoInstance extends Model<any, any>, Video {}

// Define model
const videoModel = global.sequelize.define<VideoInstance>(
  "Video",
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
    fileName: {
      type: Sequelize.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: "File name cannot be empty" },
      },
    },
    length: {
      type: Sequelize.BIGINT,
      allowNull: true,
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

export default videoModel;
