import Sequelize, { Model } from "sequelize";
import {
  ROLES,
  Course,
  COURSE_TYPE,
  GRADES,
  Comment,
  DepositRequest,
  STATUSES,
} from "../types";
import sequelize from "../database/connection";

interface DepositRequestInstance extends Model<any, any>, DepositRequest {}

// Define model
const depositRequestModel = sequelize.define<DepositRequestInstance>(
  "DepositRequest",
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
    amount: {
      type: Sequelize.FLOAT,
      allowNull: false,
      validate: {
        isNumeric: true,
      },
    },
    imageUrl: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    depositRequestStatus: {
      type: Sequelize.ENUM(STATUSES.PENDING, STATUSES.CONFIRM, STATUSES.DENIED),
      allowNull: true,
      defaultValue: STATUSES.PENDING,
    },
  },
  { timestamps: true }
);

export default depositRequestModel;
