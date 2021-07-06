import Sequelize, { Model } from "sequelize";
import {
  ROLES,
  Course,
  COURSE_TYPE,
  GRADES,
  Section,
  Lecture,
  Enrollment,
} from "../types";
import sequelize from "../database/connection";

interface EnrollmentInstance extends Model<any, any>, Enrollment {}

// Define model
const enrollmentModel = sequelize.define<EnrollmentInstance>(
  "Enrollment",
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
    learnerId: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    courseId: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
  },
  { timestamps: true }
);

export default enrollmentModel;
