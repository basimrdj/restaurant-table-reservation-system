"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class OperatingHour extends Model {}

  OperatingHour.init(
    {
      dayOfWeek: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        validate: {
          isInt: {
            msg: "Day of week must be an integer.",
          },
          min: {
            args: [0],
            msg: "Day of week must be between 0 and 6.",
          },
          max: {
            args: [6],
            msg: "Day of week must be between 0 and 6.",
          },
        },
      },
      openTime: {
        type: DataTypes.TIME,
        allowNull: true,
      },
      closeTime: {
        type: DataTypes.TIME,
        allowNull: true,
      },
      isClosed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: "operatingHour",
      tableName: "operating_hours",
      underscored: true,
    }
  );

  return OperatingHour;
};
