import { Sequelize } from "sequelize";
import { log } from "../utils/index";
import moment from "moment";

// Sequelize connection instance
const sequelize = new Sequelize(
  process.env.DB!,
  process.env.DB_USER!,
  process.env.DB_PW,
  {
    dialect: "mysql",
    host: process.env.DB_HOST,
    dialectOptions: {
      dateStrings: true,
      typeCast: true,
    },
    timezone: "+07:00",
  }
);
const verifyConnection = async () => {
  log("Verifying connection");
  try {
    await sequelize.authenticate();
    log("Connection to MySQL on GCP successfully.");
  } catch (error) {
    log("Unable to connect to the database: " + error.message);
  }
};
verifyConnection();
export default sequelize;
