const appSettings = require("../config/appSettings");
const closureDAO = require("../DAOs/closure.dao");
const operatingHourDAO = require("../DAOs/operatingHour.dao");
const reservationDAO = require("../DAOs/reservation.dao");
const tableDAO = require("../DAOs/table.dao");
const AppError = require("../utils/appError");
const {
  addMinutes,
  compareDate,
  getCurrentDateStringInTimezone,
  getCurrentTimeStringInTimezone,
  getDayOfWeek,
  minutesToTime,
  normalizeTime,
  toDateString,
  toMinutes,
} = require("../utils/time");
const { assertPositiveInteger, assertRequiredFields } = require("../utils/validation");

const MAX_ALTERNATIVES = 6;

const normalizeAvailabilityRequest = (payload) => {
  assertRequiredFields(payload, [
    "reservation_date",
    "reservation_time",
    "guest_count",
  ]);

  const reservationDate = toDateString(payload.reservation_date);
  const startTime = normalizeTime(payload.reservation_time);
  const guestCount = assertPositiveInteger(payload.guest_count, "guest_count");
  const durationMinutes = payload.duration_minutes
    ? assertPositiveInteger(payload.duration_minutes, "duration_minutes")
    : appSettings.defaultReservationDurationMinutes;
  const endTime = addMinutes(startTime, durationMinutes);
  const seatingPreference = payload.seating_preference || null;

  if (
    seatingPreference &&
    !appSettings.seatingAreas.includes(seatingPreference)
  ) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      `seating_preference must be one of: ${appSettings.seatingAreas.join(", ")}.`
    );
  }

  if (toMinutes(endTime) <= toMinutes(startTime)) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "duration_minutes creates an invalid time range."
    );
  }

  const currentDate = getCurrentDateStringInTimezone(appSettings.timezone);
  if (compareDate(reservationDate, currentDate) === -1) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "reservation_date cannot be in the past."
    );
  }

  if (
    reservationDate === currentDate &&
    toMinutes(startTime) <=
      toMinutes(getCurrentTimeStringInTimezone(appSettings.timezone))
  ) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "reservation_time must be in the future."
    );
  }

  return {
    reservationDate,
    startTime,
    endTime,
    guestCount,
    durationMinutes,
    seatingPreference,
  };
};

const buildUnavailableResponse = ({
  explanation,
  alternativeSlots = [],
  alternativeAreas = [],
}) => ({
  available: false,
  matched_area: null,
  matched_table_id: null,
  alternative_slots: alternativeSlots,
  alternative_areas: alternativeAreas,
  explanation,
});

const isWholeRestaurantClosure = (closure) => !closure.area && !closure.tableId;

const filterAvailableTables = ({
  candidateTables,
  overlappingReservations,
  overlappingClosures,
}) => {
  const reservedTableIds = new Set(
    overlappingReservations.map((reservation) => reservation.tableId)
  );
  const blockedTableIds = new Set(
    overlappingClosures
      .filter((closure) => closure.tableId)
      .map((closure) => closure.tableId)
  );
  const blockedAreas = new Set(
    overlappingClosures
      .filter((closure) => closure.area && !closure.tableId)
      .map((closure) => closure.area)
  );

  return candidateTables.filter((table) => {
    if (reservedTableIds.has(table.id)) return false;
    if (blockedTableIds.has(table.id)) return false;
    if (blockedAreas.has(table.area)) return false;
    return true;
  });
};

const findDirectMatch = async ({
  request,
  excludeReservationId = null,
  transaction = null,
  lockTables = false,
  areaOverride = null,
}) => {
  const operatingHour = await operatingHourDAO.findOperatingHourByDay(
    getDayOfWeek(request.reservationDate)
  );

  if (
    !operatingHour ||
    operatingHour.isClosed ||
    !operatingHour.openTime ||
    !operatingHour.closeTime
  ) {
    return buildUnavailableResponse({
      explanation: "Kaya is closed on the requested day.",
    });
  }

  if (
    toMinutes(request.startTime) < toMinutes(operatingHour.openTime) ||
    toMinutes(request.endTime) > toMinutes(operatingHour.closeTime)
  ) {
    return buildUnavailableResponse({
      explanation:
        "The requested reservation time falls outside Kaya's opening hours.",
    });
  }

  const overlappingClosures = await closureDAO.findOverlappingClosures({
    date: request.reservationDate,
    startTime: request.startTime,
    endTime: request.endTime,
    transaction,
  });

  if (overlappingClosures.some(isWholeRestaurantClosure)) {
    return buildUnavailableResponse({
      explanation:
        "Kaya is unavailable for the requested time because the restaurant is blocked or closed.",
    });
  }

  const areas = areaOverride
    ? [areaOverride]
    : request.seatingPreference
    ? [request.seatingPreference]
    : appSettings.seatingAreas;

  const candidateTables = await tableDAO.findActiveCandidateTables({
    areas,
    guestCount: request.guestCount,
    transaction,
    lock: lockTables && transaction ? transaction.LOCK.UPDATE : undefined,
  });

  if (candidateTables.length === 0) {
    return buildUnavailableResponse({
      explanation:
        "No active Kaya table can accommodate the requested party size.",
    });
  }

  const overlappingReservations =
    await reservationDAO.findOverlappingConfirmedReservations({
      reservationDate: request.reservationDate,
      startTime: request.startTime,
      endTime: request.endTime,
      tableIds: candidateTables.map((table) => table.id),
      excludeReservationId,
      transaction,
    });

  const availableTables = filterAvailableTables({
    candidateTables,
    overlappingReservations,
    overlappingClosures,
  });

  if (availableTables.length === 0) {
    return buildUnavailableResponse({
      explanation:
        "No suitable table is free for the requested time and seating preference.",
    });
  }

  const match = availableTables[0];

  return {
    available: true,
    matched_area: match.area,
    matched_table_id: match.id,
    matched_table_name: match.tableName,
    alternative_slots: [],
    alternative_areas: [],
    explanation: "A suitable Kaya table is available.",
  };
};

const findAlternativeAreas = async ({
  request,
  excludeReservationId,
  transaction,
}) => {
  if (!request.seatingPreference) return [];

  const alternativeAreas = [];

  for (const area of appSettings.seatingAreas) {
    if (area === request.seatingPreference) continue;
    const result = await findDirectMatch({
      request,
      excludeReservationId,
      transaction,
      areaOverride: area,
    });

    if (result.available) {
      alternativeAreas.push(area);
    }
  }

  return alternativeAreas;
};

const findNearbyAvailableSlots = async ({
  request,
  excludeReservationId,
  transaction,
}) => {
  const alternatives = [];
  const seenTimes = new Set();

  for (
    let offset = appSettings.alternativeSlotStepMinutes;
    offset <= appSettings.alternativeSearchWindowMinutes;
    offset += appSettings.alternativeSlotStepMinutes
  ) {
    for (const direction of [1, -1]) {
      const rawStartMinutes = toMinutes(request.startTime) + offset * direction;
      const rawEndMinutes = rawStartMinutes + request.durationMinutes;

      if (rawStartMinutes < 0 || rawEndMinutes > 24 * 60) {
        continue;
      }

      const startTime = minutesToTime(rawStartMinutes);

      if (seenTimes.has(startTime)) continue;
      seenTimes.add(startTime);

      const result = await findDirectMatch({
        request: {
          ...request,
          startTime,
          endTime: addMinutes(startTime, request.durationMinutes),
        },
        excludeReservationId,
        transaction,
      });

      if (result.available) {
        alternatives.push({
          reservation_time: startTime,
          end_time: addMinutes(startTime, request.durationMinutes),
          matched_area: result.matched_area,
          matched_table_id: result.matched_table_id,
        });
      }

      if (alternatives.length >= MAX_ALTERNATIVES) {
        return alternatives;
      }
    }
  }

  return alternatives;
};

const checkAvailability = async (payload, options = {}) => {
  const request = normalizeAvailabilityRequest(payload);
  const directMatch = await findDirectMatch({
    request,
    excludeReservationId: options.excludeReservationId || null,
    transaction: options.transaction || null,
    lockTables: Boolean(options.lockTables),
  });

  if (directMatch.available || options.skipAlternatives) {
    return directMatch;
  }

  const [alternativeAreas, alternativeSlots] = await Promise.all([
    findAlternativeAreas({
      request,
      excludeReservationId: options.excludeReservationId || null,
      transaction: options.transaction || null,
    }),
    findNearbyAvailableSlots({
      request,
      excludeReservationId: options.excludeReservationId || null,
      transaction: options.transaction || null,
    }),
  ]);

  return {
    ...directMatch,
    alternative_areas: alternativeAreas,
    alternative_slots: alternativeSlots,
    explanation:
      alternativeAreas.length > 0 || alternativeSlots.length > 0
        ? "The requested slot is unavailable, but Kaya found nearby alternatives."
        : directMatch.explanation,
  };
};

module.exports = {
  checkAvailability,
  normalizeAvailabilityRequest,
};
