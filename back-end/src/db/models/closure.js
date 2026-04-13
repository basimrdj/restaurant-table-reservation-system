"use strict";
const { Model } = require("sequelize");
const appSettings = require("../../config/appSettings");

module.exports = (sequelize, DataTypes) => {
  class Closure extends Model {
    static associate(models) {
      Closure.belongsTo(models.table, {
        foreignKey: "tableId",
        as: "table",
      });
    }
  }

  Closure.init(
    {
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
          isDate: {
            msg: "Closure date must be a valid date.",
          },
        },
      },
      startTime: {
        type: DataTypes.TIME,
        allowNull: false,
      },
      endTime: {
        type: DataTypes.TIME,
        allowNull: false,
      },
      area: {
        type: DataTypes.STRING(40),
        allowNull: true,
        validate: {
          isValidConfiguredArea(value) {
            if (!value) return;
            if (!appSettings.seatingAreas.includes(value)) {
              throw new Error(
                "Closure area must match a configured Kaya seating area."
              );
            }
          },
        },
      },
      reason: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          notEmpty: {
            msg: "Closure reason is required.",
          },
        },
      },
    },
    {
      sequelize,
      modelName: "closure",
      tableName: "closures",
      underscored: true,
    }
  );

  return Closure;
};
