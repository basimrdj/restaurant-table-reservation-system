const AppError = require("./appError");

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}(:\d{2})?$/;

const parseTimeParts = (value) => {
  if (typeof value !== "string" || !TIME_PATTERN.test(value)) {
    throw new AppError(400, "VALIDATION_ERROR", "Time must use HH:MM.");
  }

  const [hours, minutes, seconds = "00"] = value.split(":");
  const parsed = {
    hours: Number(hours),
    minutes: Number(minutes),
    seconds: Number(seconds),
  };

  if (
    Number.isNaN(parsed.hours) ||
    Number.isNaN(parsed.minutes) ||
    Number.isNaN(parsed.seconds) ||
    parsed.hours < 0 ||
    parsed.hours > 23 ||
    parsed.minutes < 0 ||
    parsed.minutes > 59 ||
    parsed.seconds < 0 ||
    parsed.seconds > 59
  ) {
    throw new AppError(400, "VALIDATION_ERROR", "Time must be within a day.");
  }

  return parsed;
};

const toDateString = (value) => {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
    throw new AppError(400, "VALIDATION_ERROR", "Date must use YYYY-MM-DD.");
  }
  return value;
};

const normalizeTime = (value) => {
  const { hours, minutes, seconds } = parseTimeParts(value);
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

const toMinutes = (time) => {
  const { hours, minutes } = parseTimeParts(time);
  return hours * 60 + minutes;
};

const minutesToTime = (minutes) => {
  const normalizedMinutes = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalizedMinutes / 60)
    .toString()
    .padStart(2, "0");
  const mins = (normalizedMinutes % 60).toString().padStart(2, "0");
  return `${hours}:${mins}:00`;
};

const addMinutes = (time, minutes) => {
  return minutesToTime(toMinutes(time) + minutes);
};

const isWithinRange = (targetTime, startTime, endTime) => {
  const target = toMinutes(targetTime);
  return target >= toMinutes(startTime) && target <= toMinutes(endTime);
};

const isTimeRangeWithin = (startTime, endTime, windowStart, windowEnd) => {
  return (
    toMinutes(startTime) >= toMinutes(windowStart) &&
    toMinutes(endTime) <= toMinutes(windowEnd) &&
    toMinutes(startTime) < toMinutes(endTime)
  );
};

const overlaps = (startA, endA, startB, endB) => {
  return toMinutes(startA) < toMinutes(endB) && toMinutes(endA) > toMinutes(startB);
};

const getDayOfWeek = (dateString) => {
  return new Date(`${toDateString(dateString)}T00:00:00`).getDay();
};

const compareDate = (a, b) => {
  if (a === b) return 0;
  return a > b ? 1 : -1;
};

const getCurrentDatePartsInTimezone = (timeZone) => {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date()).reduce((accumulator, part) => {
    if (part.type !== "literal") {
      accumulator[part.type] = part.value;
    }
    return accumulator;
  }, {});

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
};

const getCurrentDateStringInTimezone = (timeZone) => {
  const parts = getCurrentDatePartsInTimezone(timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
};

const getCurrentTimeStringInTimezone = (timeZone) => {
  const parts = getCurrentDatePartsInTimezone(timeZone);
  return `${parts.hour}:${parts.minute}:${parts.second}`;
};

module.exports = {
  addMinutes,
  compareDate,
  getCurrentDateStringInTimezone,
  getCurrentTimeStringInTimezone,
  getDayOfWeek,
  isTimeRangeWithin,
  isWithinRange,
  minutesToTime,
  normalizeTime,
  overlaps,
  toDateString,
  toMinutes,
};
