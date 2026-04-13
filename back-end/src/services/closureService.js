const appSettings = require("../config/appSettings");
const closureDAO = require("../DAOs/closure.dao");
const tableDAO = require("../DAOs/table.dao");
const AppError = require("../utils/appError");
const { serializeClosure } = require("../utils/serializers");
const { normalizeTime, toDateString, toMinutes } = require("../utils/time");
const { assertRequiredFields } = require("../utils/validation");

const listClosures = async (date) => {
  const closures = await closureDAO.listClosures(date ? { date } : {});
  return closures.map(serializeClosure);
};

const createClosure = async (payload) => {
  assertRequiredFields(payload, ["date", "start_time", "end_time", "reason"]);

  const date = toDateString(payload.date);
  const startTime = normalizeTime(payload.start_time);
  const endTime = normalizeTime(payload.end_time);

  if (toMinutes(endTime) <= toMinutes(startTime)) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "end_time must be later than start_time."
    );
  }

  if (payload.area && !appSettings.seatingAreas.includes(payload.area)) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      `area must be one of: ${appSettings.seatingAreas.join(", ")}.`
    );
  }

  let tableId = null;
  if (payload.table_id) {
    const table = await tableDAO.findTableById(payload.table_id);
    if (!table) {
      throw new AppError(404, "NOT_FOUND", "table_id does not exist.");
    }
    tableId = table.id;
  }

  const closure = await closureDAO.createClosure({
    date,
    startTime,
    endTime,
    area: payload.area || null,
    tableId,
    reason: payload.reason.trim(),
  });

  const populatedClosure = await closureDAO.findClosureById(closure.id);
  return serializeClosure(populatedClosure);
};

const deleteClosure = async (closureId) => {
  const closure = await closureDAO.findClosureById(closureId);
  if (!closure) {
    throw new AppError(404, "NOT_FOUND", "Closure was not found.");
  }

  await closureDAO.deleteClosure(closure);
  return { id: closureId };
};

module.exports = {
  createClosure,
  deleteClosure,
  listClosures,
};
