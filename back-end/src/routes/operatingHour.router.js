const express = require("express");
const router = express.Router();
const tryCatchHandler = require("../middleware/tryCatch");
const httpMethodError = require("../middleware/httpMethodError");
const operatingHourController = require("../controllers/operatingHour.controller");

router
  .route("/")
  .get(tryCatchHandler(operatingHourController.listHandler))
  .put(tryCatchHandler(operatingHourController.updateHandler))
  .all(httpMethodError);

module.exports = router;
