const express = require("express");
const router = express.Router();
const tryCatchHandler = require("../middleware/tryCatch");
const httpMethodError = require("../middleware/httpMethodError");
const retellController = require("../controllers/retell.controller");

router
  .route("/lookup-customer")
  .post(tryCatchHandler(retellController.lookupCustomerHandler))
  .all(httpMethodError);

router
  .route("/inbound-webhook")
  .post(tryCatchHandler(retellController.inboundWebhookHandler))
  .all(httpMethodError);

router
  .route("/check-availability")
  .post(tryCatchHandler(retellController.checkAvailabilityHandler))
  .all(httpMethodError);

router
  .route("/create-reservation")
  .post(tryCatchHandler(retellController.createReservationHandler))
  .all(httpMethodError);

router
  .route("/modify-reservation")
  .post(tryCatchHandler(retellController.modifyReservationHandler))
  .all(httpMethodError);

router
  .route("/cancel-reservation")
  .post(tryCatchHandler(retellController.cancelReservationHandler))
  .all(httpMethodError);

module.exports = router;
