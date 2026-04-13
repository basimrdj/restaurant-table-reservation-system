const operatingHourDAO = require("../DAOs/operatingHour.dao");
const AppError = require("../utils/appError");
const { serializeOperatingHour } = require("../utils/serializers");
const { normalizeTime, toMinutes } = require("../utils/time");

const listOperatingHours = async () => {
  const hours = await operatingHourDAO.getAllOperatingHours();
  return hours.map(serializeOperatingHour);
};

const updateOperatingHours = async (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "items must be a non-empty array of operating hours."
    );
  }

  const normalizedItems = items.map((item) => {
    const dayOfWeek = Number(item.day_of_week);
    const isClosed = Boolean(item.is_closed);

    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "day_of_week must be between 0 and 6."
      );
    }

    if (isClosed) {
      return {
        dayOfWeek,
        openTime: null,
        closeTime: null,
        isClosed: true,
      };
    }

    const openTime = normalizeTime(item.open_time);
    const closeTime = normalizeTime(item.close_time);

    if (toMinutes(closeTime) <= toMinutes(openTime)) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "close_time must be later than open_time."
      );
    }

    return {
      dayOfWeek,
      openTime,
      closeTime,
      isClosed: false,
    };
  });

  const uniqueDays = new Set(normalizedItems.map((item) => item.dayOfWeek));
  if (uniqueDays.size !== normalizedItems.length) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "Each day_of_week can only appear once in the payload."
    );
  }

  const updatedHours = await operatingHourDAO.bulkUpsertOperatingHours(
    normalizedItems
  );

  return updatedHours.map(serializeOperatingHour);
};

module.exports = {
  listOperatingHours,
  updateOperatingHours,
};
