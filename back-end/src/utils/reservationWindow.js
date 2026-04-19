const appSettings = require("../config/appSettings");
const { minutesToTime, toMinutes } = require("./time");

const hasOperatingWindow = (operatingHour) =>
  Boolean(
    operatingHour &&
      !operatingHour.isClosed &&
      operatingHour.openTime &&
      operatingHour.closeTime
  );

const resolveReservationWindow = ({
  operatingHour,
  requestedDurationMinutes,
  startTime,
}) => {
  if (!hasOperatingWindow(operatingHour)) {
    return {
      allowed: false,
      reason: "closed",
    };
  }

  const openMinutes = toMinutes(operatingHour.openTime);
  const closeMinutes = toMinutes(operatingHour.closeTime);
  const startMinutes = toMinutes(startTime);
  const fullEndMinutes = startMinutes + requestedDurationMinutes;
  const remainingMinutes = closeMinutes - startMinutes;
  const finalReservationDurationMinutes =
    appSettings.finalReservationDurationMinutes;
  const finalReservationWindowStart =
    closeMinutes - finalReservationDurationMinutes;

  if (startMinutes < openMinutes || startMinutes >= closeMinutes) {
    return {
      allowed: false,
      reason: "outside_hours",
      remainingMinutes: Math.max(remainingMinutes, 0),
    };
  }

  if (fullEndMinutes <= closeMinutes) {
    return {
      allowed: true,
      effectiveDurationMinutes: requestedDurationMinutes,
      endTime: minutesToTime(fullEndMinutes),
      wasShortened: false,
    };
  }

  if (
    startMinutes >= finalReservationWindowStart &&
    remainingMinutes >= finalReservationDurationMinutes
  ) {
    return {
      allowed: true,
      effectiveDurationMinutes: remainingMinutes,
      endTime: minutesToTime(closeMinutes),
      wasShortened: true,
    };
  }

  return {
    allowed: false,
    reason: "insufficient_time_before_close",
    remainingMinutes: Math.max(remainingMinutes, 0),
  };
};

module.exports = {
  hasOperatingWindow,
  resolveReservationWindow,
};
