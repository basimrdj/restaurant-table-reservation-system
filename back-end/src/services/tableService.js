const appSettings = require("../config/appSettings");
const tableDAO = require("../DAOs/table.dao");
const AppError = require("../utils/appError");
const { serializeTable } = require("../utils/serializers");
const { assertPositiveInteger, assertRequiredFields } = require("../utils/validation");

const validateArea = (area) => {
  if (!appSettings.seatingAreas.includes(area)) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      `area must be one of: ${appSettings.seatingAreas.join(", ")}.`
    );
  }
};

const listTables = async () => {
  const tables = await tableDAO.getAllTables();
  return tables.map(serializeTable);
};

const createTable = async (payload) => {
  assertRequiredFields(payload, ["table_name", "area", "capacity"]);
  validateArea(payload.area);

  const table = await tableDAO.createTable({
    tableName: payload.table_name.trim(),
    area: payload.area,
    capacity: assertPositiveInteger(payload.capacity, "capacity"),
    isActive: payload.is_active !== undefined ? Boolean(payload.is_active) : true,
    notes: payload.notes || null,
  });

  return serializeTable(table);
};

const updateTable = async (tableId, payload) => {
  const table = await tableDAO.findTableById(tableId);
  if (!table) {
    throw new AppError(404, "NOT_FOUND", "Table was not found.");
  }

  if (payload.area !== undefined) {
    validateArea(payload.area);
  }

  const updatedTable = await tableDAO.updateTable(table, {
    tableName:
      payload.table_name !== undefined ? payload.table_name.trim() : table.tableName,
    area: payload.area !== undefined ? payload.area : table.area,
    capacity:
      payload.capacity !== undefined
        ? assertPositiveInteger(payload.capacity, "capacity")
        : table.capacity,
    isActive:
      payload.is_active !== undefined ? Boolean(payload.is_active) : table.isActive,
    notes: payload.notes !== undefined ? payload.notes || null : table.notes,
  });

  return serializeTable(updatedTable);
};

module.exports = {
  createTable,
  listTables,
  updateTable,
};
