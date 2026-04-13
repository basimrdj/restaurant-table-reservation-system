const reservationService = require("../services/reservationService");
const retellAdapterService = require("../services/retellAdapterService");
const logger = require("../utils/logger");
const { sanitizeForLogs } = require("../utils/logSanitizer");

const splitDiagnostics = (payload) => {
  if (!payload || typeof payload !== "object") {
    return {
      diagnostics: {},
      response: payload,
    };
  }

  const { __diagnostics, ...response } = payload;

  return {
    diagnostics:
      __diagnostics && typeof __diagnostics === "object" ? __diagnostics : {},
    response,
  };
};

const logRetellEvent = (event, details) => {
  logger.info(
    JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      ...details,
    })
  );
};

const respondWithRetellLogging = async ({ endpoint, handler, req, res }) => {
  const startedAt = Date.now();

  logRetellEvent("retell_request", {
    endpoint,
    request_payload: sanitizeForLogs(req.body),
  });

  const rawResult = await handler();
  const { diagnostics, response } = splitDiagnostics(rawResult);

  logRetellEvent("retell_response", {
    endpoint,
    latency_ms: Date.now() - startedAt,
    normalized_values: sanitizeForLogs(diagnostics.normalized_values || {}),
    response_body: sanitizeForLogs(response),
    status: 200,
  });

  return res.status(200).json(response);
};

const lookupCustomerHandler = async (req, res) => {
  return respondWithRetellLogging({
    endpoint: "lookup-customer",
    handler: () => retellAdapterService.lookupCustomerForRetell(req.body),
    req,
    res,
  });
};

const inboundWebhookHandler = async (req, res) => {
  return respondWithRetellLogging({
    endpoint: "inbound-webhook",
    handler: () => retellAdapterService.buildInboundWebhookResponse(req.body),
    req,
    res,
  });
};

const checkAvailabilityHandler = async (req, res) => {
  return respondWithRetellLogging({
    endpoint: "check-availability",
    handler: () => retellAdapterService.checkAvailabilityForRetell(req.body),
    req,
    res,
  });
};

const createReservationHandler = async (req, res) => {
  return respondWithRetellLogging({
    endpoint: "create-reservation",
    handler: () => retellAdapterService.createReservationForRetell(req.body),
    req,
    res,
  });
};

const modifyReservationHandler = async (req, res) => {
  const reservation = await reservationService.modifyReservation(
    req.body.reservation_id,
    req.body
  );

  return res.status(200).json({
    success: true,
    reservation_id: reservation.id,
    confirmation_summary: `Reservation updated to ${reservation.reservation_date} at ${reservation.start_time}.`,
    assigned_table: reservation.table?.table_name || null,
    assigned_area: reservation.seating_area,
  });
};

const cancelReservationHandler = async (req, res) => {
  const reservation = await reservationService.cancelReservation(
    req.body.reservation_id
  );

  return res.status(200).json({
    success: true,
    reservation_id: reservation.id,
    status: reservation.status,
    confirmation_summary: `Reservation ${reservation.id} has been cancelled.`,
  });
};

module.exports = {
  cancelReservationHandler,
  checkAvailabilityHandler,
  createReservationHandler,
  inboundWebhookHandler,
  lookupCustomerHandler,
  modifyReservationHandler,
};
