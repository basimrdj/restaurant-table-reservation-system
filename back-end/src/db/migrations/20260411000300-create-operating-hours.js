"use strict";

const defaultOperatingHours = Array.from({ length: 7 }, (_, dayOfWeek) => ({
  day_of_week: dayOfWeek,
  open_time: "13:00:00",
  close_time: "24:00:00",
  is_closed: false,
  created_at: new Date(),
  updated_at: new Date(),
}));

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("operating_hours", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      day_of_week: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
      },
      open_time: {
        type: Sequelize.TIME,
        allowNull: true,
      },
      close_time: {
        type: Sequelize.TIME,
        allowNull: true,
      },
      is_closed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.bulkInsert("operating_hours", defaultOperatingHours);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("operating_hours");
  },
};
