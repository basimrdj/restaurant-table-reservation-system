const express = require("express");
const router = express.Router();
const tryCatchHandler = require("../middleware/tryCatch");
const httpMethodError = require("../middleware/httpMethodError");
const closureController = require("../controllers/closure.controller");

router
  .route("/")
  .get(tryCatchHandler(closureController.listHandler))
  .post(tryCatchHandler(closureController.createHandler))
  .all(httpMethodError);

router
  .route("/:closureId")
  .delete(tryCatchHandler(closureController.deleteHandler))
  .all(httpMethodError);

module.exports = router;
