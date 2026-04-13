const appSettings = require("../config/appSettings");
const customerDAO = require("../DAOs/customer.dao");
const reservationDAO = require("../DAOs/reservation.dao");
const { normalizePhoneToE164 } = require("../utils/phone");
const { serializeCustomer } = require("../utils/serializers");
const AppError = require("../utils/appError");

const summarizeLatestVisit = (reservation) => {
  if (!reservation) {
    return {
      is_returning_customer: false,
      last_seating_area: null,
      last_party_size: null,
      last_visit_summary: null,
    };
  }

  return {
    is_returning_customer: true,
    last_seating_area: reservation.seatingArea,
    last_party_size: reservation.guestCount,
    last_visit_summary: `Booked ${
      reservation.seatingArea || "the restaurant"
    } for ${reservation.guestCount} guests on the last completed visit.`,
  };
};

const inferPreferredSeatingArea = (reservations) => {
  const completedReservations = reservations.filter(
    (reservation) => reservation.status === "completed" && reservation.seatingArea
  );

  if (completedReservations.length === 0) return null;

  const counts = completedReservations.reduce((accumulator, reservation) => {
    const currentCount = accumulator[reservation.seatingArea] || 0;
    return {
      ...accumulator,
      [reservation.seatingArea]: currentCount + 1,
    };
  }, {});

  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
};

const buildLookupSummary = async (customer) => {
  const lastCompletedReservation =
    await reservationDAO.findLatestCompletedReservationForCustomer(customer.id);
  const visitSummary = summarizeLatestVisit(lastCompletedReservation);

  return {
    customer_id: customer.id,
    customer_name: customer.name,
    preferred_language: customer.preferredLanguage,
    reception_number: appSettings.receptionNumber,
    ...visitSummary,
  };
};

const lookupCustomerByPhone = async (phoneNumber) => {
  const phoneE164 = normalizePhoneToE164(
    phoneNumber,
    appSettings.defaultPhoneCountry
  );
  const customer = await customerDAO.findCustomerByPhone(phoneE164);

  if (!customer) {
    return {
      customer_id: null,
      customer_name: null,
      is_returning_customer: false,
      preferred_language: null,
      last_seating_area: null,
      last_party_size: null,
      last_visit_summary: null,
      reception_number: appSettings.receptionNumber,
    };
  }

  return buildLookupSummary(customer);
};

const getOrCreateCustomer = async ({
  customerName,
  phoneNumber,
  preferredLanguage,
  notes,
  transaction,
}) => {
  const phoneE164 = normalizePhoneToE164(
    phoneNumber,
    appSettings.defaultPhoneCountry
  );
  const existingCustomer = await customerDAO.findCustomerByPhone(phoneE164, {
    transaction,
  });

  if (existingCustomer) {
    const patch = {};
    if (preferredLanguage && !existingCustomer.preferredLanguage) {
      patch.preferredLanguage = preferredLanguage;
    }
    if (notes && !existingCustomer.notes) {
      patch.notes = notes;
    }

    if (Object.keys(patch).length > 0) {
      await customerDAO.updateCustomer(existingCustomer, patch, {
        transaction,
      });
    }

    return existingCustomer;
  }

  if (!customerName) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "customer_name is required when creating a new customer."
    );
  }

  return customerDAO.createCustomer(
    {
      name: customerName.trim(),
      phoneE164,
      preferredLanguage: preferredLanguage || null,
      notes: notes || null,
    },
    { transaction }
  );
};

const syncCustomerLastVisit = async (customerId, transaction) => {
  const customer = await customerDAO.findCustomerById(customerId, { transaction });
  if (!customer) {
    return null;
  }

  const latestCompletedReservation =
    await reservationDAO.findLatestCompletedReservationForCustomer(customerId, {
      transaction,
    });

  await customerDAO.updateCustomer(
    customer,
    {
      lastVisitAt: latestCompletedReservation
        ? new Date(
            `${latestCompletedReservation.reservationDate}T${latestCompletedReservation.endTime}`
          )
        : null,
    },
    { transaction }
  );

  return customer;
};

const listCustomers = async (query = "") => {
  const customers = await customerDAO.searchCustomers(query);

  return Promise.all(
    customers.map(async (customer) => {
      const lookupSummary = await buildLookupSummary(customer);
      return {
        ...serializeCustomer(customer),
        preferred_seating_area: lookupSummary.last_seating_area,
        last_party_size: lookupSummary.last_party_size,
        is_returning_customer: lookupSummary.is_returning_customer,
      };
    })
  );
};

const getCustomerDetail = async (customerId) => {
  const customer = await customerDAO.findCustomerById(customerId);
  if (!customer) {
    throw new AppError(404, "NOT_FOUND", "Customer was not found.");
  }

  const reservations = (customer.reservations || []).sort((left, right) => {
    if (left.reservationDate === right.reservationDate) {
      return right.startTime.localeCompare(left.startTime);
    }
    return right.reservationDate.localeCompare(left.reservationDate);
  });
  const detail = serializeCustomer(customer, reservations);
  const lookupSummary = await buildLookupSummary(customer);

  return {
    ...detail,
    preferred_seating_area: inferPreferredSeatingArea(reservations),
    last_party_size: lookupSummary.last_party_size,
    last_visit_summary: lookupSummary.last_visit_summary,
    is_returning_customer: lookupSummary.is_returning_customer,
  };
};

const updateCustomer = async (customerId, payload) => {
  const customer = await customerDAO.findCustomerById(customerId);
  if (!customer) {
    throw new AppError(404, "NOT_FOUND", "Customer was not found.");
  }

  const updatedCustomer = await customerDAO.updateCustomer(customer, {
    name: payload.name !== undefined ? payload.name.trim() : customer.name,
    preferredLanguage:
      payload.preferred_language !== undefined
        ? payload.preferred_language || null
        : customer.preferredLanguage,
    notes: payload.notes !== undefined ? payload.notes || null : customer.notes,
    vipFlag:
      payload.vip_flag !== undefined ? Boolean(payload.vip_flag) : customer.vipFlag,
  });

  return getCustomerDetail(updatedCustomer.id);
};

module.exports = {
  getCustomerDetail,
  getOrCreateCustomer,
  listCustomers,
  lookupCustomerByPhone,
  syncCustomerLastVisit,
  updateCustomer,
};
