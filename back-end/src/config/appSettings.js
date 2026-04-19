const DEFAULT_SEATING_AREAS = [
  "indoor",
  "indoor_rooftop",
  "outdoor_rooftop",
];

const normalizeList = (value, fallback) => {
  if (!value) return fallback;
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? items : fallback;
};

const resolveReceptionNumber = () => {
  const configuredValue = [
    process.env.RECEPTION_NUMBER,
    process.env.KAYA_RECEPTION_NUMBER,
  ]
    .map((value) => (value || "").trim())
    .find(Boolean);

  return configuredValue || "+923060792539";
};

const restaurantSettings = {
  restaurantName: process.env.RESTAURANT_NAME || "Kaya",
  timezone: process.env.RESTAURANT_TIMEZONE || "Asia/Karachi",
  defaultReservationDurationMinutes: Number(
    process.env.DEFAULT_RESERVATION_DURATION_MINUTES || 120
  ),
  finalReservationDurationMinutes: Number(
    process.env.FINAL_RESERVATION_DURATION_MINUTES || 60
  ),
  alternativeSlotStepMinutes: Number(
    process.env.ALTERNATIVE_SLOT_STEP_MINUTES || 30
  ),
  alternativeSearchWindowMinutes: Number(
    process.env.ALTERNATIVE_SEARCH_WINDOW_MINUTES || 120
  ),
  defaultPhoneCountry: process.env.DEFAULT_PHONE_COUNTRY || "92",
  seatingAreas: normalizeList(
    process.env.SEATING_AREAS,
    DEFAULT_SEATING_AREAS
  ),
  receptionNumber: resolveReceptionNumber(),
};

module.exports = restaurantSettings;
