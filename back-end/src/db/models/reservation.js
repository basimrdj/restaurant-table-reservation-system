"use strict";
const { Model } = require("sequelize");
const appSettings = require("../../config/appSettings");

const RESERVATION_STATUSES = [
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
];

const RESERVATION_SOURCES = [
  "phone_agent",
  "whatsapp",
  "staff_dashboard",
  "manual",
  "web",
];

module.exports = (sequelize, DataTypes) => {
  class Reservation extends Model {
    static associate(models) {
      Reservation.belongsTo(models.customer, {
        foreignKey: "customerId",
        as: "customer",
      });
      Reservation.belongsTo(models.table, {
        foreignKey: "tableId",
        as: "table",
      });
    }
  }

  Reservation.init(
    {
      reservationDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
          notEmpty: {
            msg: "Reservation date is required.",
          },
          isDate: {
            msg: "Reservation date must be a valid date.",
          },
        },
      },
      startTime: {
        type: DataTypes.TIME,
        allowNull: false,
        validate: {
          notEmpty: {
            msg: "Start time is required.",
          },
        },
      },
      endTime: {
        type: DataTypes.TIME,
        allowNull: false,
        validate: {
          notEmpty: {
            msg: "End time is required.",
          },
        },
      },
      guestCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          isInt: {
            msg: "Guest count must be an integer.",
          },
          min: {
            args: [1],
            msg: "Guest count must be at least 1.",
          },
        },
      },
      seatingArea: {
        type: DataTypes.STRING(40),
        allowNull: true,
        validate: {
          isValidConfiguredArea(value) {
            if (!value) return;
            if (!appSettings.seatingAreas.includes(value)) {
              throw new Error(
                "Seating area must match a configured Kaya seating area."
              );
            }
          },
        },
      },
      status: {
        type: DataTypes.ENUM(...RESERVATION_STATUSES),
        allowNull: false,
        defaultValue: "confirmed",
      },
      source: {
        type: DataTypes.ENUM(...RESERVATION_SOURCES),
        allowNull: false,
        defaultValue: "manual",
      },
      specialRequest: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      idempotencyKey: {
        type: DataTypes.STRING(120),
        allowNull: true,
        unique: true,
      },
    },
    {
      sequelize,
      modelName: "reservation",
      tableName: "reservations",
      underscored: true,
    }
  );

  Reservation.RESERVATION_STATUSES = RESERVATION_STATUSES;
  Reservation.RESERVATION_SOURCES = RESERVATION_SOURCES;

  return Reservation;
};
