const appSettings = require("../config/appSettings");
const operatingHourDAO = require("../DAOs/operatingHour.dao");
const { serializeOperatingHour } = require("../utils/serializers");

const getSettings = async () => {
  const operatingHours = await operatingHourDAO.getAllOperatingHours();

  return {
    restaurant_name: appSettings.restaurantName,
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
