const express = require("express");
const router = express.Router();
const tryCatchHandler = require("../middleware/tryCatch");
const httpMethodError = require("../middleware/httpMethodError");
const tableController = require("../controllers/table.controller");

router
  .route("/")
  .get(tryCatchHandler(tableController.listHandler))
  .post(tryCatchHandler(tableController.createHandler))
  .all(httpMethodError);

router
  .route("/:tableId")
  .patch(tryCatchHandler(tableController.updateHandler))
  .all(httpMethodError);

module.exports = router;
