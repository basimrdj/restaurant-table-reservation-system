const reservationService = require("../services/reservationService");
const reservationFeedService = require("../services/reservationFeedService");

const listHandler = async (req, res) => {
  const reservations = await reservationService.listReservations({
    date: req.query.date,
    status: req.query.status,
  });

  return res.status(200).json({
    success: true,
    collection: reservations,
  });
};

const createHandler = async (req, res) => {
  const result = await reservationService.createReservation(req.body);

  return res.status(result.created ? 201 : 200).json({
    success: true,
    item: result.reservation,
    duplicate: !result.created,
  });
};

const updateHandler = async (req, res) => {
  const reservation = await reservationService.modifyReservation(
    req.params.reservationId,
    req.body
  );

  return res.status(200).json({
    success: true,
    item: reservation,
  });
};

const cancelHandler = async (req, res) => {
  const reservation = await reservationService.cancelReservation(
    req.params.reservationId
  );

  return res.status(200).json({
    success: true,
    item: reservation,
  });
};

const statusHandler = async (req, res) => {
  const reservation = await reservationService.updateReservationStatus(
    req.params.reservationId,
    req.body.status
  );

  return res.status(200).json({
    success: true,
    item: reservation,
  });
};

const streamHandler = (req, res) => {
  reservationFeedService.openReservationFeed(req, res);
};

module.exports = {
  cancelHandler,
  createHandler,
  listHandler,
  statusHandler,
  streamHandler,
  updateHandler,
};
