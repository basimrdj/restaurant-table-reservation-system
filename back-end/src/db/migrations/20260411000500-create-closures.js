"use strict";

const tableExists = async (queryInterface, tableName) => {
  const tables = await queryInterface.showAllTables();
  return tables.some((entry) => {
    if (typeof entry === "string") {
      return entry === tableName;
    }

    if (entry && typeof entry === "object") {
      return (
        entry.tableName === tableName ||
        entry.table_name === tableName ||
        entry.name === tableName
      );
    }

    return false;
  });
};

const indexExists = async (queryInterface, tableName, indexName) => {
  const indexes = await queryInterface.showIndex(tableName);
  return indexes.some((entry) => entry?.name === indexName);
};

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await tableExists(queryInterface, "closures"))) {
      await queryInterface.createTable("closures", {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        date: {
          type: Sequelize.DATEONLY,
          allowNull: false,
        },
        start_time: {
          type: Sequelize.TIME,
          allowNull: false,
        },
        end_time: {
          type: Sequelize.TIME,
          allowNull: false,
        },
        area: {
          type: Sequelize.STRING(40),
          allowNull: true,
        },
        table_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: "tables",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        reason: {
          type: Sequelize.STRING(255),
          allowNull: false,
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
    }

    if (
      !(await indexExists(
        queryInterface,
        "closures",
        "cls_date_area_table_time_idx"
      ))
    ) {
      await queryInterface.addIndex(
        "closures",
        ["date", "area", "table_id", "start_time", "end_time"],
        { name: "cls_date_area_table_time_idx" }
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable("closures");
  },
};
