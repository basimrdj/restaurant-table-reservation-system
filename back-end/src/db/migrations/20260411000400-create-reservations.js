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
    if (!(await tableExists(queryInterface, "reservations"))) {
      await queryInterface.createTable("reservations", {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        customer_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: "customers",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT",
        },
        table_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: "tables",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT",
        },
        reservation_date: {
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
        guest_count: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        seating_area: {
          type: Sequelize.STRING(40),
          allowNull: true,
        },
        status: {
          type: Sequelize.ENUM("confirmed", "cancelled", "completed", "no_show"),
          allowNull: false,
          defaultValue: "confirmed",
        },
        source: {
          type: Sequelize.ENUM(
            "phone_agent",
            "whatsapp",
            "staff_dashboard",
            "manual",
            "web"
          ),
          allowNull: false,
          defaultValue: "manual",
        },
        special_request: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        idempotency_key: {
          type: Sequelize.STRING(120),
          allowNull: true,
          unique: true,
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
        "reservations",
        "res_date_table_status_time_idx"
      ))
    ) {
      await queryInterface.addIndex(
        "reservations",
        ["reservation_date", "table_id", "status", "start_time", "end_time"],
        { name: "res_date_table_status_time_idx" }
      );
    }

    if (
      !(await indexExists(
        queryInterface,
        "reservations",
        "res_customer_date_status_idx"
      ))
    ) {
      await queryInterface.addIndex(
        "reservations",
        ["customer_id", "reservation_date", "status"],
        { name: "res_customer_date_status_idx" }
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable("reservations");
  },
};
