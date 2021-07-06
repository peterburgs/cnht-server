import Sequelize, { Model } from "sequelize";
import { ROLES, User } from "../types";
import sequelize from "../database/connection";

interface UserInstance extends Model<any, any>, User {}

// Define model
const userModel = sequelize.define<UserInstance>(
  "User",
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
    email: {
      type: Sequelize.STRING(255),
      allowNull: false,
      unique: { name: "email", msg: "Email existed" },
      validate: {
        isEmail: { msg: "Email is not valid" },
      },
    },
    fullName: {
      type: Sequelize.TEXT,
      allowNull: true,
      defaultValue: "New User",
    },
    avatarUrl: {
      type: Sequelize.TEXT,
      allowNull: true,
      defaultValue: "/images/person.png",
    },
    userRole: {
      type: Sequelize.ENUM(ROLES.ADMIN, ROLES.LEARNER),
      allowNull: false,
      defaultValue: ROLES.LEARNER,
    },
    balance: {
      type: Sequelize.FLOAT,
      allowNull: false,
      defaultValue: 0,
      validate: {
        isNumeric: { msg: "Balance must be a number" },
      },
    },
  },
  { timestamps: true }
);

export default userModel;
