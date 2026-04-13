const AppError = require("./appError");

const stripToDigits = (value) => value.replace(/[^\d+]/g, "");

const normalizePhoneToE164 = (value, defaultCountryCode) => {
  if (!value || typeof value !== "string") {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "Phone number is required for customer lookup."
    );
  }

  let candidate = stripToDigits(value.trim());

  if (candidate.startsWith("00")) {
    candidate = `+${candidate.slice(2)}`;
  }

  if (candidate.startsWith("+")) {
    const digits = candidate.slice(1).replace(/\D/g, "");
    return validateE164(`+${digits}`);
  }

  const defaultCountry = String(defaultCountryCode || "").replace(/\D/g, "");
  if (!defaultCountry) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "Phone number must include a country code."
    );
  }

  const digits = candidate.replace(/\D/g, "");

  if (defaultCountry === "92") {
    if (digits.startsWith("0")) {
      return validateE164(`+92${digits.slice(1)}`);
    }
    if (digits.startsWith("92")) {
      return validateE164(`+${digits}`);
    }
    if (digits.length === 10 && digits.startsWith("3")) {
      return validateE164(`+92${digits}`);
    }
  }

  return validateE164(`+${defaultCountry}${digits}`);
};

const validateE164 = (value) => {
  if (!/^\+[1-9]\d{7,14}$/.test(value)) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "Phone number could not be normalized to E.164."
    );
  }

  return value;
};

module.exports = {
  normalizePhoneToE164,
};
