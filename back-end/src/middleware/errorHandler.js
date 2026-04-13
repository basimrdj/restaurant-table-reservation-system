const getErrorMessagesByColumn = require("../utils/getErrorMessages");
const logger = require("../utils/logger");
const AppError = require("../utils/appError");

const errorHandler = (err, req, res, next) => {
  if (
    err.name === "SequelizeValidationError" ||
    err.name === "SequelizeUniqueConstraintError"
  ) {
    return res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: "Request validation failed.",
      errors: getErrorMessagesByColumn(err.errors),
    });
  }

  if (err instanceof AppError) {
    return res.status(err.status).json({
      success: false,
      code: err.code,
      message: err.message,
      ...(err.fieldErrors ? { errors: err.fieldErrors } : {}),
    });
  }

  logger.error(`${req.method} ${req.originalUrl} - ${err.stack || err.message}`);

  return res.status(err?.status || 500).json({
    success: false,
    code: "INTERNAL_ERROR",
    message: "Something went wrong. Please try again later.",
  });
};

module.exports = errorHandler;
