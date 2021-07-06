import { Sequelize } from "sequelize";

declare global {
  namespace NodeJS {
    interface Global {
      sequelize: Sequelize;
    }
  }
}
