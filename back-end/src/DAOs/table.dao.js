const db = require("../db/models");
const { Op } = db.Sequelize;

const Table = db.table;

const getAllTables = async () => {
  return Table.findAll({
    order: [
      ["area", "ASC"],
      ["capacity", "ASC"],
      ["tableName", "ASC"],
    ],
  });
};

const findTableById = async (tableId, options = {}) => {
  return Table.findByPk(tableId, options);
};

const createTable = async (payload) => {
  return Table.create(payload);
};

const updateTable = async (table, payload) => {
  return table.update(payload);
};

const findActiveCandidateTables = async ({
  areas,
  guestCount,
  transaction,
  lock,
}) => {
  return Table.findAll({
    where: {
      isActive: true,
      capacity: { [Op.gte]: guestCount },
      ...(areas?.length ? { area: { [Op.in]: areas } } : {}),
    },
    order: [
      ["capacity", "ASC"],
      ["tableName", "ASC"],
      ["id", "ASC"],
    ],
    transaction,
    ...(lock ? { lock } : {}),
  });
};

module.exports = {
  createTable,
  findActiveCandidateTables,
  findTableById,
  getAllTables,
  updateTable,
};
