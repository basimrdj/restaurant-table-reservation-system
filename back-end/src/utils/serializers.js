const serializeTable = (table) => {
  if (!table) return null;

  return {
    id: table.id,
    table_name: table.tableName,
    area: table.area,
    capacity: table.capacity,
    is_active: table.isActive,
    notes: table.notes,
    created_at: table.createdAt,
    updated_at: table.updatedAt,
  };
};

const serializeReservation = (reservation) => {
  if (!reservation) return null;

  return {
    id: reservation.id,
    reservation_date: reservation.reservationDate,
    start_time: reservation.startTime,
    end_time: reservation.endTime,
    guest_count: reservation.guestCount,
    seating_area: reservation.seatingArea,
    status: reservation.status,
    source: reservation.source,
    special_request: reservation.specialRequest,
    idempotency_key: reservation.idempotencyKey,
    created_at: reservation.createdAt,
    updated_at: reservation.updatedAt,
    customer_id: reservation.customerId,
    table_id: reservation.tableId,
    customer: reservation.customer
      ? {
          id: reservation.customer.id,
          name: reservation.customer.name,
          phone_e164: reservation.customer.phoneE164,
          preferred_language: reservation.customer.preferredLanguage,
          notes: reservation.customer.notes,
          vip_flag: reservation.customer.vipFlag,
          last_visit_at: reservation.customer.lastVisitAt,
        }
      : null,
    table: serializeTable(reservation.table),
  };
};

const serializeCustomer = (customer, reservationHistory = []) => {
  if (!customer) return null;

  return {
    id: customer.id,
    name: customer.name,
    phone_e164: customer.phoneE164,
    preferred_language: customer.preferredLanguage,
    notes: customer.notes,
    vip_flag: customer.vipFlag,
    last_visit_at: customer.lastVisitAt,
    created_at: customer.createdAt,
    updated_at: customer.updatedAt,
    reservation_history: reservationHistory.map(serializeReservation),
  };
};

const serializeClosure = (closure) => {
  if (!closure) return null;

  return {
    id: closure.id,
    date: closure.date,
    start_time: closure.startTime,
    end_time: closure.endTime,
    area: closure.area,
    table_id: closure.tableId,
    reason: closure.reason,
    created_at: closure.createdAt,
    updated_at: closure.updatedAt,
    table: serializeTable(closure.table),
  };
};

const serializeOperatingHour = (operatingHour) => {
  if (!operatingHour) return null;

  return {
    id: operatingHour.id,
    day_of_week: operatingHour.dayOfWeek,
    open_time: operatingHour.openTime,
    close_time: operatingHour.closeTime,
    is_closed: operatingHour.isClosed,
  };
};

module.exports = {
  serializeClosure,
  serializeCustomer,
  serializeOperatingHour,
  serializeReservation,
  serializeTable,
};
