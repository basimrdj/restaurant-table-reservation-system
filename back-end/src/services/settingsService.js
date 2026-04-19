const appSettings = require("../config/appSettings");
const operatingHourDAO = require("../DAOs/operatingHour.dao");
const { serializeOperatingHour } = require("../utils/serializers");

const formatTimeForSummary = (value) => {
  if (!value) return "";

  const [rawHours, rawMinutes = "00"] = String(value).split(":");
  const numericHours = Number(rawHours);
  const numericMinutes = Number(rawMinutes);
  const normalizedHours = numericHours === 24 ? 0 : numericHours;
  const meridiem = normalizedHours >= 12 ? "PM" : "AM";
  const twelveHour = normalizedHours % 12 || 12;

  if (numericMinutes === 0) {
    return `${twelveHour} ${meridiem}`;
  }

  return `${twelveHour}:${String(numericMinutes).padStart(2, "0")} ${meridiem}`;
};

const buildHoursSummary = (operatingHours) => {
  if (!Array.isArray(operatingHours) || operatingHours.length === 0) {
    return "";
  }

  const openTimes = new Set(
    operatingHours.filter((item) => !item.isClosed).map((item) => item.openTime)
  );
  const closeTimes = new Set(
    operatingHours.filter((item) => !item.isClosed).map((item) => item.closeTime)
  );

  if (openTimes.size === 1 && closeTimes.size === 1) {
    const [openTime] = [...openTimes];
    const [closeTime] = [...closeTimes];

    return `Daily ${formatTimeForSummary(openTime)} to ${formatTimeForSummary(
      closeTime
    )}`;
  }

  return "";
};

const getSettings = async () => {
  const operatingHours = await operatingHourDAO.getAllOperatingHours();

  return {
    restaurant_name: appSettings.restaurantName,
    hours_summary: buildHoursSummary(operatingHours),
    timezone: appSettings.timezone,
    default_reservation_duration_minutes:
      appSettings.defaultReservationDurationMinutes,
    alternative_slot_step_minutes: appSettings.alternativeSlotStepMinutes,
    default_phone_country: appSettings.defaultPhoneCountry,
    seating_areas: appSettings.seatingAreas,
    reception_number: appSettings.receptionNumber,
    weekly_hours: operatingHours.map(serializeOperatingHour),
  };
};

module.exports = {
  getSettings,
};
