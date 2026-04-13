const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const buildSqliteConfig = (dialect, storagePath) => {
  if (dialect !== "sqlite") {
    return {};
  }

  return {
    storage:
      storagePath || path.resolve(__dirname, "../src/db/dev.sqlite3"),
  };
};

module.exports = {
  development: {
    username: process.env.DB_USERNAME || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "kaya_reservation_system",
    host: process.env.DB_HOST || "127.0.0.1",
    dialect: process.env.DB_DIALECT || "mysql",
    port: process.env.DB_PORT || 3306,
    server_port: process.env.PORT || 5000,
    ...buildSqliteConfig(process.env.DB_DIALECT || "mysql", process.env.DB_STORAGE),
  },
  test: {
    username: process.env.DB_USERNAME || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME_TEST || "kaya_reservation_system_test",
    host: process.env.DB_HOST || "127.0.0.1",
    dialect: process.env.DB_DIALECT_TEST || "sqlite",
    storage: process.env.DB_STORAGE_TEST || ":memory:",
    logging: false,
    server_port: process.env.PORT || 5001,
  },
  production: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT,
    port: process.env.DB_PORT,
    server_port: process.env.PORT,
    ...buildSqliteConfig(process.env.DB_DIALECT, process.env.DB_STORAGE),
  },
};
