import Sequelize, { Model } from "sequelize";
import { ROLES, Course, COURSE_TYPE, GRADES } from "../types";

interface CourseInstance extends Model<any, any>, Course {}

// Define model
const courseModel = global.sequelize.define<CourseInstance>(
  "Course",
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
    courseDescription: {
      type: Sequelize.TEXT,
      allowNull: true,
      defaultValue: "",
    },
    price: {
      type: Sequelize.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    courseType: {
      type: Sequelize.ENUM(COURSE_TYPE.THEORY, COURSE_TYPE.EXAMINATION_SOLVING),
      allowNull: false,
      defaultValue: COURSE_TYPE.THEORY,
    },
    grade: {
      type: Sequelize.ENUM(GRADES.TWELFTH, GRADES.ELEVENTH, GRADES.TENTH),
      allowNull: false,
      defaultValue: GRADES.TWELFTH,
    },
    thumbnailUrl: {
      type: Sequelize.TEXT,
      allowNull: false,
      defaultValue: "",
    },
    isHidden: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  { timestamps: true }
);

export default courseModel;
