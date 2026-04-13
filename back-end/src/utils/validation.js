const AppError = require("./appError");

const assertRequiredFields = (payload, fields) => {
  const fieldErrors = fields.reduce((errors, field) => {
    if (
      payload[field] === undefined ||
      payload[field] === null ||
      payload[field] === ""
    ) {
      errors[field] = [`${field} is required.`];
    }

    return errors;
  }, {});

  if (Object.keys(fieldErrors).length > 0) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "Required fields are missing.",
      fieldErrors
    );
  }
};

const assertEnum = (value, values, fieldName) => {
  if (value !== undefined && value !== null && !values.includes(value)) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      `${fieldName} must be one of: ${values.join(", ")}.`
    );
  }
};

const assertPositiveInteger = (value, fieldName) => {
  const numericValue = Number(value);
  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      `${fieldName} must be a positive integer.`
    );
  }
  return numericValue;
};

module.exports = {
  assertEnum,
  assertPositiveInteger,
  assertRequiredFields,
};
