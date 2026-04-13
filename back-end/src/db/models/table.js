"use strict";
const { Model } = require("sequelize");
const appSettings = require("../../config/appSettings");

module.exports = (sequelize, DataTypes) => {
  class Table extends Model {
    static associate(models) {
      Table.hasMany(models.reservation, {
        foreignKey: "tableId",
        as: "reservations",
      });
      Table.hasMany(models.closure, {
        foreignKey: "tableId",
        as: "closures",
      });
    }
  }

  Table.init(
    {
      tableName: {
        type: DataTypes.STRING(60),
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: {
            msg: "Table name is required.",
          },
        },
      },
      area: {
        type: DataTypes.STRING(40),
        allowNull: false,
        validate: {
          isIn: {
            args: [appSettings.seatingAreas],
            msg: "Area must match a configured Kaya seating area.",
          },
        },
      },
      capacity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          isInt: {
            msg: "Capacity must be an integer.",
          },
          min: {
            args: [1],
            msg: "Capacity must be at least 1.",
          },
        },
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "table",
      tableName: "tables",
      underscored: true,
    }
  );

  return Table;
};
