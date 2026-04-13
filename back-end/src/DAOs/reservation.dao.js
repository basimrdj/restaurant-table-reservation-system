const db = require("../db/models");
const { Op } = db.Sequelize;

const Reservation = db.reservation;
const Customer = db.customer;
const Table = db.table;

const reservationIncludes = [
  {
    model: Customer,
    as: "customer",
  },
  {
    model: Table,
    as: "table",
  },
];

const listReservations = async (filters = {}) => {
  const where = {};

  if (filters.date) {
    where.reservationDate = filters.date;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  return Reservation.findAll({
    where,
    include: reservationIncludes,
    order: [
      ["reservationDate", "ASC"],
      ["startTime", "ASC"],
    ],
  });
};

const findReservationById = async (reservationId, options = {}) => {
  return Reservation.findByPk(reservationId, {
    include: reservationIncludes,
    ...options,
  });
};

const createReservation = async (payload, options = {}) => {
  return Reservation.create(payload, options);
};

const updateReservation = async (reservation, payload, options = {}) => {
  return reservation.update(payload, options);
};

const findOverlappingConfirmedReservations = async ({
  reservationDate,
  startTime,
  endTime,
  tableIds,
  excludeReservationId,
  transaction,
}) => {
  const where = {
    reservationDate,
    status: "confirmed",
    tableId: { [Op.in]: tableIds },
    startTime: { [Op.lt]: endTime },
    endTime: { [Op.gt]: startTime },
  };

  if (excludeReservationId) {
    where.id = {
      [Op.ne]: excludeReservationId,
    };
  }

  return Reservation.findAll({
    where,
    transaction,
  });
};

const findActiveDuplicateReservation = async ({
  customerId,
  reservationDate,
  startTime,
  guestCount,
  excludeReservationId,
  transaction,
  lock,
}) => {
  const where = {
    customerId,
    reservationDate,
    startTime,
    guestCount,
    status: "confirmed",
  };

  if (excludeReservationId) {
    where.id = { [Op.ne]: excludeReservationId };
  }

  return Reservation.findOne({
    where,
    include: reservationIncludes,
    transaction,
    ...(lock ? { lock } : {}),
  });
};

const findByIdempotencyKey = async (idempotencyKey, options = {}) => {
  if (!idempotencyKey) return null;

  return Reservation.findOne({
    where: { idempotencyKey },
    include: reservationIncludes,
    ...options,
  });
};

const listReservationsForCustomer = async (customerId) => {
  return Reservation.findAll({
    where: {
      customerId,
    },
    include: reservationIncludes,
    order: [
      ["reservationDate", "DESC"],
      ["startTime", "DESC"],
    ],
  });
};

const findLatestCompletedReservationForCustomer = async (
  customerId,
  options = {}
) => {
  return Reservation.findOne({
    where: {
      customerId,
      status: "completed",
    },
    include: reservationIncludes,
    order: [
      ["reservationDate", "DESC"],
      ["startTime", "DESC"],
    ],
    ...options,
  });
};

module.exports = {
  createReservation,
  findActiveDuplicateReservation,
  findByIdempotencyKey,
  findLatestCompletedReservationForCustomer,
  findOverlappingConfirmedReservations,
  findReservationById,
  listReservations,
  listReservationsForCustomer,
  updateReservation,
};
