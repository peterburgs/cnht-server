import DataTypes from "sequelize";
const userModel = global.sequelize.define("User", {
  id: {
    type: DataTypes.UUIDV4,
  },
});
