const db = require("../db/models");
const reservationDAO = require("../DAOs/reservation.dao");
const customerService = require("./customerService");
const availabilityService = require("./availabilityService");
const AppError = require("../utils/appError");
const { serializeReservation } = require("../utils/serializers");
const { assertEnum, assertRequiredFields } = require("../utils/validation");

const ReservationModel = db.reservation;

const getReservationResponse = async (reservationId, transaction) => {
  const reservation = await reservationDAO.findReservationById(reservationId, {
    transaction,
  });
  return serializeReservation(reservation);
};

const buildReservationWritePayload = (payload) => {
  assertRequiredFields(payload, [
    "customer_name",
    "phone_number",
    "reservation_date",
    "reservation_time",
    "guest_count",
  ]);

  if (payload.source) {
    assertEnum(
      payload.source,
      ReservationModel.RESERVATION_SOURCES,
      "source"
    );
  }

  return {
    customerName: payload.customer_name.trim(),
    phoneNumber: payload.phone_number,
    reservationDate: payload.reservation_date,
    reservationTime: payload.reservation_time,
    guestCount: payload.guest_count,
    seatingPreference: payload.seating_preference || null,
    specialRequest: payload.special_request || null,
    source: payload.source || "manual",
    idempotencyKey: payload.idempotency_key || null,
    durationMinutes: payload.duration_minutes || null,
    preferredLanguage: payload.preferred_language || null,
  };
};

const ensureReservationIsMutable = (reservation) => {
  if (!reservation) {
    throw new AppError(404, "NOT_FOUND", "Reservation was not found.");
  }

  if (reservation.status !== "confirmed") {
    throw new AppError(
      409,
      "INVALID_STATE",
      "Only confirmed reservations can be modified."
    );
  }
};

const createReservation = async (payload) => {
  const writePayload = buildReservationWritePayload(payload);

  return db.sequelize.transaction(async (transaction) => {
    if (writePayload.idempotencyKey) {
      const existingByKey = await reservationDAO.findByIdempotencyKey(
        writePayload.idempotencyKey,
        { transaction }
      );

      if (existingByKey) {
        return {
          created: false,
          reservation: serializeReservation(existingByKey),
          availability: null,
        };
      }
    }

    const customer = await customerService.getOrCreateCustomer({
      customerName: writePayload.customerName,
      phoneNumber: writePayload.phoneNumber,
      preferredLanguage: writePayload.preferredLanguage,
      transaction,
    });

    const normalizedRequest = availabilityService.normalizeAvailabilityRequest({
      reservation_date: writePayload.reservationDate,
      reservation_time: writePayload.reservationTime,
      guest_count: writePayload.guestCount,
      seating_preference: writePayload.seatingPreference,
      duration_minutes: writePayload.durationMinutes,
    });

    const duplicateReservation =
      await reservationDAO.findActiveDuplicateReservation({
        customerId: customer.id,
        reservationDate: normalizedRequest.reservationDate,
        startTime: normalizedRequest.startTime,
        guestCount: normalizedRequest.guestCount,
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

    if (duplicateReservation) {
      return {
        created: false,
        reservation: serializeReservation(duplicateReservation),
        availability: null,
      };
    }

    const availability = await availabilityService.checkAvailability(
      {
        reservation_date: normalizedRequest.reservationDate,
        reservation_time: normalizedRequest.startTime,
        guest_count: normalizedRequest.guestCount,
        seating_preference: writePayload.seatingPreference,
        duration_minutes: normalizedRequest.durationMinutes,
      },
      {
        transaction,
        lockTables: true,
        skipAlternatives: true,
      }
    );

    if (!availability.available) {
      throw new AppError(
        409,
        "UNAVAILABLE_SLOT",
        availability.explanation,
        {
          alternative_slots: availability.alternative_slots,
          alternative_areas: availability.alternative_areas,
        }
      );
    }

    const createdReservation = await reservationDAO.createReservation(
      {
        customerId: customer.id,
        tableId: availability.matched_table_id,
        reservationDate: normalizedRequest.reservationDate,
        startTime: normalizedRequest.startTime,
        endTime: normalizedRequest.endTime,
        guestCount: normalizedRequest.guestCount,
        seatingArea: availability.matched_area,
        status: "confirmed",
        source: writePayload.source,
        specialRequest: writePayload.specialRequest,
        idempotencyKey: writePayload.idempotencyKey,
      },
      { transaction }
    );

    return {
      created: true,
      reservation: await getReservationResponse(createdReservation.id, transaction),
      availability,
    };
  });
};

const listReservations = async (filters = {}) => {
  const reservations = await reservationDAO.listReservations({
    date: filters.date || null,
    status: filters.status || null,
  });

  return reservations.map(serializeReservation);
};

const modifyReservation = async (reservationId, payload) => {
  const existingReservation = await reservationDAO.findReservationById(reservationId);
  ensureReservationIsMutable(existingReservation);

  const writePayload = buildReservationWritePayload({
    ...payload,
    customer_name:
      payload.customer_name || existingReservation.customer?.name || "",
    phone_number:
      payload.phone_number || existingReservation.customer?.phoneE164 || "",
    reservation_date:
      payload.reservation_date || existingReservation.reservationDate,
    reservation_time: payload.reservation_time || existingReservation.startTime,
    guest_count: payload.guest_count || existingReservation.guestCount,
  });

  return db.sequelize.transaction(async (transaction) => {
    const lockedReservation = await reservationDAO.findReservationById(
      reservationId,
      { transaction, lock: transaction.LOCK.UPDATE }
    );
    ensureReservationIsMutable(lockedReservation);

    const customer = await customerService.getOrCreateCustomer({
      customerName: writePayload.customerName,
      phoneNumber: writePayload.phoneNumber,
      preferredLanguage: writePayload.preferredLanguage,
      transaction,
    });

    const normalizedRequest = availabilityService.normalizeAvailabilityRequest({
      reservation_date: writePayload.reservationDate,
      reservation_time: writePayload.reservationTime,
      guest_count: writePayload.guestCount,
      seating_preference: writePayload.seatingPreference,
      duration_minutes: writePayload.durationMinutes,
    });

    const duplicateReservation =
      await reservationDAO.findActiveDuplicateReservation({
        customerId: customer.id,
        reservationDate: normalizedRequest.reservationDate,
        startTime: normalizedRequest.startTime,
        guestCount: normalizedRequest.guestCount,
        excludeReservationId: reservationId,
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

    if (duplicateReservation) {
      throw new AppError(
        409,
        "DUPLICATE_BOOKING",
        "A matching confirmed reservation already exists for this customer."
      );
    }

    const availability = await availabilityService.checkAvailability(
      {
        reservation_date: normalizedRequest.reservationDate,
        reservation_time: normalizedRequest.startTime,
        guest_count: normalizedRequest.guestCount,
        seating_preference: writePayload.seatingPreference,
        duration_minutes: normalizedRequest.durationMinutes,
      },
      {
        excludeReservationId: reservationId,
        transaction,
        lockTables: true,
        skipAlternatives: true,
      }
    );

    if (!availability.available) {
      throw new AppError(
        409,
        "UNAVAILABLE_SLOT",
        availability.explanation,
        {
          alternative_slots: availability.alternative_slots,
          alternative_areas: availability.alternative_areas,
        }
      );
    }

    await reservationDAO.updateReservation(
      lockedReservation,
      {
        customerId: customer.id,
        tableId: availability.matched_table_id,
        reservationDate: normalizedRequest.reservationDate,
        startTime: normalizedRequest.startTime,
        endTime: normalizedRequest.endTime,
        guestCount: normalizedRequest.guestCount,
        seatingArea: availability.matched_area,
        source: writePayload.source,
        specialRequest: writePayload.specialRequest,
      },
      { transaction }
    );

    return getReservationResponse(reservationId, transaction);
  });
};

const updateReservationStatus = async (reservationId, status) => {
  assertEnum(status, ReservationModel.RESERVATION_STATUSES, "status");

  return db.sequelize.transaction(async (transaction) => {
    const reservation = await reservationDAO.findReservationById(reservationId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!reservation) {
      throw new AppError(404, "NOT_FOUND", "Reservation was not found.");
    }

    await reservationDAO.updateReservation(
      reservation,
      {
        status,
      },
      { transaction }
    );

    await customerService.syncCustomerLastVisit(reservation.customerId, transaction);
    return getReservationResponse(reservationId, transaction);
  });
};

const cancelReservation = async (reservationId) => {
  return updateReservationStatus(reservationId, "cancelled");
};

module.exports = {
  cancelReservation,
  createReservation,
  listReservations,
  modifyReservation,
  updateReservationStatus,
};
