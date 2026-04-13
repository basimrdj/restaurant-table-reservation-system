"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Customer extends Model {
    static associate(models) {
      Customer.hasMany(models.reservation, {
        foreignKey: "customerId",
        as: "reservations",
      });
    }
  }

  Customer.init(
    {
      name: {
        type: DataTypes.STRING(120),
        allowNull: false,
        validate: {
          notEmpty: {
            msg: "Customer name is required.",
          },
        },
      },
      phoneE164: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: {
            msg: "Phone number is required.",
          },
          is: {
            args: /^\+[1-9]\d{7,14}$/,
            msg: "Phone number must be stored in E.164 format.",
          },
        },
      },
      preferredLanguage: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      vipFlag: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      lastVisitAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "customer",
      tableName: "customers",
      underscored: true,
    }
  );

  return Customer;
};
