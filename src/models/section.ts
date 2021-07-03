import Sequelize, { Model } from "sequelize";
import { ROLES, Course, COURSE_TYPE, GRADES, Section } from "../types";

interface SectionInstance extends Model<any, any>, Section {}

// Define model
const sectionModel = global.sequelize.define<SectionInstance>(
  "Section",
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
    courseId: {
      type: Sequelize.TEXT,
      allowNull: true,
      defaultValue: "",
    },
    sectionOrder: {
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

export default sectionModel;
