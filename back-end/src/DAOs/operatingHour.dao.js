const db = require("../db/models");

const OperatingHour = db.operatingHour;

const getAllOperatingHours = async () => {
  return OperatingHour.findAll({
    order: [["dayOfWeek", "ASC"]],
  });
};

const findOperatingHourByDay = async (dayOfWeek) => {
  return OperatingHour.findOne({
    where: { dayOfWeek },
  });
};

const bulkUpsertOperatingHours = async (items) => {
  await Promise.all(
    items.map((item) =>
      OperatingHour.upsert({
        dayOfWeek: item.dayOfWeek,
        openTime: item.openTime,
        closeTime: item.closeTime,
        isClosed: item.isClosed,
      })
    )
  );

  return getAllOperatingHours();
};

module.exports = {
  bulkUpsertOperatingHours,
  findOperatingHourByDay,
  getAllOperatingHours,
};
