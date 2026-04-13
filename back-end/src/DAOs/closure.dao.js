const db = require("../db/models");
const { Op } = db.Sequelize;

const Closure = db.closure;
const Table = db.table;

const listClosures = async (filters = {}) => {
  const where = {};

  if (filters.date) {
    where.date = filters.date;
  }

  return Closure.findAll({
    where,
    include: [
      {
        model: Table,
        as: "table",
      },
    ],
    order: [
      ["date", "ASC"],
      ["startTime", "ASC"],
    ],
  });
};

const findClosureById = async (closureId) => {
  return Closure.findByPk(closureId, {
    include: [
      {
        model: Table,
        as: "table",
      },
    ],
  });
};

const createClosure = async (payload) => {
  return Closure.create(payload);
};

const deleteClosure = async (closure) => {
  return closure.destroy();
};

const findOverlappingClosures = async ({
  date,
  startTime,
  endTime,
  transaction,
}) => {
  return Closure.findAll({
    where: {
      date,
      startTime: { [Op.lt]: endTime },
      endTime: { [Op.gt]: startTime },
    },
    transaction,
  });
};

module.exports = {
  createClosure,
  deleteClosure,
  findClosureById,
  findOverlappingClosures,
  listClosures,
};
