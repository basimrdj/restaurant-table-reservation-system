const appSettings = require("../config/appSettings");
const closureDAO = require("../DAOs/closure.dao");
const operatingHourDAO = require("../DAOs/operatingHour.dao");
const reservationDAO = require("../DAOs/reservation.dao");
const tableDAO = require("../DAOs/table.dao");
const AppError = require("../utils/appError");
const {
  hasOperatingWindow,
  resolveReservationWindow,
} = require("../utils/reservationWindow");
const {
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
    guestCount,
    durationMinutes,
    seatingPreference,
  };
};

const buildTimingUnavailableExplanation = ({
  operatingHour,
  timingResolution,
}) => {
  if (!hasOperatingWindow(operatingHour)) {
    return "Kaya is closed on the requested day.";
  }

  if (timingResolution?.reason === "insufficient_time_before_close") {
    return "The requested reservation time is too close to Kaya's closing time.";
  }

  return "The requested reservation time falls outside Kaya's opening hours.";
};

const prepareAvailabilityRequest = async (payload) => {
  const request = normalizeAvailabilityRequest(payload);
  const operatingHour = await operatingHourDAO.findOperatingHourByDay(
    getDayOfWeek(request.reservationDate)
  );
  const timingResolution = resolveReservationWindow({
    operatingHour,
    requestedDurationMinutes: request.durationMinutes,
    startTime: request.startTime,
  });

  if (!timingResolution.allowed) {
    return {
      ok: false,
      explanation: buildTimingUnavailableExplanation({
        operatingHour,
        timingResolution,
      }),
      operatingHour,
      request,
      timingResolution,
    };
  }

  return {
    ok: true,
    operatingHour,
    request: {
      ...request,
      requestedDurationMinutes: request.durationMinutes,
      durationMinutes: timingResolution.effectiveDurationMinutes,
      endTime: timingResolution.endTime,
    },
    timingResolution,
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
  operatingHour = null,
}) => {
  const resolvedOperatingHour =
    operatingHour ||
    (await operatingHourDAO.findOperatingHourByDay(
      getDayOfWeek(request.reservationDate)
    ));

  if (
    !resolvedOperatingHour ||
    resolvedOperatingHour.isClosed ||
    !resolvedOperatingHour.openTime ||
    !resolvedOperatingHour.closeTime
  ) {
    return buildUnavailableResponse({
      explanation: "Kaya is closed on the requested day.",
    });
  }

  if (
    toMinutes(request.startTime) < toMinutes(resolvedOperatingHour.openTime) ||
    toMinutes(request.endTime) > toMinutes(resolvedOperatingHour.closeTime)
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
  operatingHour,
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
      operatingHour,
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
  operatingHour,
}) => {
  const alternatives = [];
  const seenTimes = new Set();
  const searchDurationMinutes =
    request.requestedDurationMinutes || request.durationMinutes;

  for (
    let offset = appSettings.alternativeSlotStepMinutes;
    offset <= appSettings.alternativeSearchWindowMinutes;
    offset += appSettings.alternativeSlotStepMinutes
  ) {
    for (const direction of [1, -1]) {
      const rawStartMinutes = toMinutes(request.startTime) + offset * direction;
      const rawEndMinutes = rawStartMinutes + searchDurationMinutes;

      if (rawStartMinutes < 0 || rawEndMinutes > 24 * 60) {
        continue;
      }

      const startTime = minutesToTime(rawStartMinutes);
      const timingResolution = resolveReservationWindow({
        operatingHour,
        requestedDurationMinutes: searchDurationMinutes,
        startTime,
      });

      if (!timingResolution.allowed || seenTimes.has(startTime)) continue;
      seenTimes.add(startTime);

      const result = await findDirectMatch({
        request: {
          ...request,
          startTime,
          durationMinutes: timingResolution.effectiveDurationMinutes,
          endTime: timingResolution.endTime,
        },
        excludeReservationId,
        transaction,
        operatingHour,
      });

      if (result.available) {
        alternatives.push({
          reservation_time: startTime,
          end_time: timingResolution.endTime,
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
  const preparedRequest = await prepareAvailabilityRequest(payload);

  if (!preparedRequest.ok) {
    return buildUnavailableResponse({
      explanation: preparedRequest.explanation,
    });
  }

  const request = preparedRequest.request;
  const operatingHour = preparedRequest.operatingHour;
  const directMatch = await findDirectMatch({
    request,
    excludeReservationId: options.excludeReservationId || null,
    transaction: options.transaction || null,
    lockTables: Boolean(options.lockTables),
    operatingHour,
  });

  if (directMatch.available || options.skipAlternatives) {
    return directMatch;
  }

  const [alternativeAreas, alternativeSlots] = await Promise.all([
    findAlternativeAreas({
      request,
      excludeReservationId: options.excludeReservationId || null,
      transaction: options.transaction || null,
      operatingHour,
    }),
    findNearbyAvailableSlots({
      request,
      excludeReservationId: options.excludeReservationId || null,
      transaction: options.transaction || null,
      operatingHour,
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
  prepareAvailabilityRequest,
};
