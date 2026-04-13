const express = require("express");
const router = express.Router();
const tryCatchHandler = require("../middleware/tryCatch");
const httpMethodError = require("../middleware/httpMethodError");
const customerController = require("../controllers/customer.controller");

router
  .route("/")
  .get(tryCatchHandler(customerController.listHandler))
  .all(httpMethodError);

router
  .route("/:customerId")
  .get(tryCatchHandler(customerController.getByIdHandler))
  .patch(tryCatchHandler(customerController.updateHandler))
  .all(httpMethodError);

module.exports = router;
