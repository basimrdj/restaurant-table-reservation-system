const express = require("express");
const router = express.Router();
const tryCatchHandler = require("../middleware/tryCatch");
const httpMethodError = require("../middleware/httpMethodError");
const reservationController = require("../controllers/reservation.controller");

router
  .route("/")
  .get(tryCatchHandler(reservationController.listHandler))
  .post(tryCatchHandler(reservationController.createHandler))
  .all(httpMethodError);

router
  .route("/events")
  .get(reservationController.streamHandler)
  .all(httpMethodError);

router
  .route("/:reservationId")
  .patch(tryCatchHandler(reservationController.updateHandler))
  .all(httpMethodError);

router
  .route("/:reservationId/cancel")
  .post(tryCatchHandler(reservationController.cancelHandler))
  .all(httpMethodError);

router
  .route("/:reservationId/status")
  .post(tryCatchHandler(reservationController.statusHandler))
  .all(httpMethodError);

module.exports = router;
