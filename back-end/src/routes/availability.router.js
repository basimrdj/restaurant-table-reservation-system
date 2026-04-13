const express = require("express");
const router = express.Router();
const tryCatchHandler = require("../middleware/tryCatch");
const httpMethodError = require("../middleware/httpMethodError");
const availabilityController = require("../controllers/availability.controller");

router
  .route("/check")
  .post(tryCatchHandler(availabilityController.checkHandler))
  .all(httpMethodError);

module.exports = router;
