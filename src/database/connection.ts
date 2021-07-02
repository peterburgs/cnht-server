import { Sequelize } from "sequelize";
import { log } from "../utils/index";

// Sequelize connection instance
const sequelize = new Sequelize(
  process.env.DB!,
  process.env.DB_USER!,
  process.env.DB_PW,
  {
    dialect: "mysql",
    host: process.env.DB_HOST,
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
