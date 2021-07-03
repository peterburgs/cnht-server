import Sequelize, { Model } from "sequelize";
import { ROLES, Course, COURSE_TYPE, GRADES, Section, Lecture } from "../types";

interface LectureInstance extends Model<any, any>, Lecture {}

// Define model
const lectureModel = global.sequelize.define<LectureInstance>(
  "Lecture",
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
    title: {
      type: Sequelize.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: { msg: "Title cannot be empty" },
      },
    },
    sectionId: {
      type: Sequelize.TEXT,
      allowNull: true,
      defaultValue: "",
    },
    lectureOrder: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    isHidden: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  { timestamps: true }
);

export default lectureModel;
