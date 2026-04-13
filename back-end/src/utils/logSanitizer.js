"use strict";

const PHONE_KEYS = new Set([
  "caller_phone_number",
  "from_number",
  "phone",
  "phone_number",
  "phonee164",
]);

const NAME_KEYS = new Set([
  "customer_name",
  "customer_name_input",
  "name",
]);

const isPlainObject = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const maskPhoneNumber = (value) => {
  const text = String(value || "").trim();

  if (!text) {
    return "";
  }

  if (text.length <= 4) {
    return `***${text}`;
  }

  return `${"*".repeat(Math.max(0, text.length - 4))}${text.slice(-4)}`;
};

const maskName = (value) => {
  const text = String(value || "").trim();

  if (!text) {
    return "";
  }

  const tokens = text.split(/\s+/).filter(Boolean);

  return tokens
    .map((token) => {
      if (token.length <= 2) {
        return `${token[0] || ""}*`;
      }

      return `${token.slice(0, 2)}***`;
    })
    .join(" ");
};

const sanitizeForLogs = (value, key = "") => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLogs(item, key));
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([nestedKey, nestedValue]) => [
        nestedKey,
        sanitizeForLogs(nestedValue, nestedKey),
      ]),
    );
  }

  const normalizedKey = String(key || "").toLowerCase();

  if (PHONE_KEYS.has(normalizedKey)) {
    return maskPhoneNumber(value);
  }

  if (NAME_KEYS.has(normalizedKey)) {
    return maskName(value);
  }

  return value;
};

module.exports = {
  sanitizeForLogs,
};
