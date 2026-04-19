const appSettings = require("../config/appSettings");
const operatingHourDAO = require("../DAOs/operatingHour.dao");
const AppError = require("../utils/appError");
const { normalizePhoneToE164 } = require("../utils/phone");
const { resolveReservationWindow } = require("../utils/reservationWindow");
const {
  getDayOfWeek,
  getCurrentDateStringInTimezone,
  normalizeTime,
  toMinutes,
} = require("../utils/time");
const availabilityService = require("./availabilityService");
const customerService = require("./customerService");
const reservationService = require("./reservationService");

const HUMAN_SEATING_AREAS = Object.freeze({
  indoor: "indoor",
  indoor_rooftop: "indoor rooftop",
  outdoor_rooftop: "outdoor rooftop",
});

const SEATING_AREA_ALIASES = Object.freeze({
  indoor: "indoor",
  indoorroof: "indoor_rooftop",
  indoorrooftop: "indoor_rooftop",
  "indoorroof top": "indoor_rooftop",
  "indoor rooftop": "indoor_rooftop",
  outdoorroof: "outdoor_rooftop",
  outdoorrooftop: "outdoor_rooftop",
  "outdoorroof top": "outdoor_rooftop",
  "outdoor rooftop": "outdoor_rooftop",
});

const WEEKDAY_ALIASES = Object.freeze({
  friday: 5,
  monday: 1,
  saturday: 6,
  sunday: 0,
  thursday: 4,
  tuesday: 2,
  wednesday: 3,
});

const MONTH_ALIASES = Object.freeze({
  april: 4,
  august: 8,
  december: 12,
  february: 2,
  january: 1,
  july: 7,
  june: 6,
  march: 3,
  may: 5,
  november: 11,
  october: 10,
  september: 9,
  اپریل: 4,
  اگست: 8,
  دسمبر: 12,
  فروری: 2,
  جنوری: 1,
  جولائی: 7,
  جون: 6,
  مارچ: 3,
  مئی: 5,
  نومبر: 11,
  اکتوبر: 10,
  ستمبر: 9,
  अप्रैल: 4,
  अगस्त: 8,
  दिसंबर: 12,
  दिसम्बर: 12,
  फरवरी: 2,
  जनवरी: 1,
  जुलाई: 7,
  जून: 6,
  मार्च: 3,
  मई: 5,
  नवंबर: 11,
  नवम्बर: 11,
  अक्टूबर: 10,
  सितंबर: 9,
  सितम्बर: 9,
});

const DEVANAGARI_DIGIT_MAP = Object.freeze({
  "०": "0",
  "१": "1",
  "२": "2",
  "३": "3",
  "४": "4",
  "५": "5",
  "६": "6",
  "७": "7",
  "८": "8",
  "९": "9",
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
});

const HINDI_TIME_NUMBER_ALIASES = Object.freeze({
  "ایک": "1",
  "एक": "1",
  "دو": "2",
  "दो": "2",
  "تین": "3",
  "तीन": "3",
  "چار": "4",
  "चार": "4",
  "پانچ": "5",
  "पांच": "5",
  "पाँच": "5",
  "چھ": "6",
  "छह": "6",
  "छः": "6",
  "سات": "7",
  "सात": "7",
  "آٹھ": "8",
  "आठ": "8",
  "نو": "9",
  "नौ": "9",
  "دس": "10",
  "दस": "10",
  "گیارہ": "11",
  "ग्यारह": "11",
  "بارہ": "12",
  "बारह": "12",
});

const HINDI_DATE_NUMBER_ALIASES = Object.freeze({
  "ایک": "1",
  "एक": "1",
  "دو": "2",
  "दो": "2",
  "تین": "3",
  "तीन": "3",
  "چار": "4",
  "चार": "4",
  "پانچ": "5",
  "पांच": "5",
  "पाँच": "5",
  "چھ": "6",
  "छह": "6",
  "छः": "6",
  "سات": "7",
  "सात": "7",
  "آٹھ": "8",
  "आठ": "8",
  "نو": "9",
  "नौ": "9",
  "دس": "10",
  "दस": "10",
  "گیارہ": "11",
  "ग्यारह": "11",
  "بارہ": "12",
  "बारह": "12",
  "تیرہ": "13",
  "तेरह": "13",
  "چودہ": "14",
  "चौदह": "14",
  "پندرہ": "15",
  "पंद्रह": "15",
  "पन्द्रह": "15",
  "سولہ": "16",
  "सोलह": "16",
  "سترہ": "17",
  "सत्रह": "17",
  "اٹھارہ": "18",
  "अठारह": "18",
  "انیس": "19",
  "उन्नीस": "19",
  "بیس": "20",
  "बीस": "20",
  "اکیس": "21",
  "इक्कीस": "21",
  "بائیس": "22",
  "बाईस": "22",
  "تئیس": "23",
  "तेईस": "23",
  "چوبیس": "24",
  "चौबीस": "24",
  "پچیس": "25",
  "पच्चीस": "25",
  "چھبیس": "26",
  "छब्बीस": "26",
  "ستائیس": "27",
  "सत्ताईस": "27",
  "اٹھائیس": "28",
  "अट्ठाईस": "28",
  "انتیس": "29",
  "उनतीस": "29",
  "تیس": "30",
  "तीस": "30",
  "اکتیس": "31",
  "इकतीस": "31",
});

const RELATIVE_DATE_OFFSETS = Object.freeze({
  "آج": 0,
  "ابھی": 0,
  "आज": 0,
  "अभी": 0,
  aaj: 0,
  abhi: 0,
  "کل": 1,
  now: 0,
  today: 0,
  tomorrow: 1,
  "कल": 1,
  kal: 1,
  "پرسوں": 2,
  "day after tomorrow": 2,
  "परसों": 2,
  parso: 2,
  parson: 2,
});

const AM_TOKENS = ["am", "a.m.", "morning", "subah", "सुबह", "صبح"];
const PM_TOKENS = [
  "pm",
  "p.m.",
  "evening",
  "shaam",
  "sham",
  "شام",
  "शाम",
  "night",
  "raat",
  "رات",
  "रात",
  "tonight",
  "dinner",
  "late night",
  "aadhi raat",
  "आधी रात",
  "रात में",
];
const AFTERNOON_TOKENS = [
  "afternoon",
  "dopahar",
  "dopehar",
  "dupehar",
  "دوپہر",
  "दोपहर",
  "din",
  "دن",
  "दिन",
  "day",
  "lunch",
  "lunch time",
  "dinner time",
  "noon",
];

const DATE_CONTEXT_SUFFIX_TOKENS = new Set([
  ...AM_TOKENS,
  ...PM_TOKENS,
  ...AFTERNOON_TOKENS,
  "mein",
  "me",
  "में",
  "میں",
  "ka",
  "ki",
  "ke",
  "का",
  "की",
  "के",
  "کا",
  "کی",
  "کے",
  "time",
  "date",
  "tareekh",
  "tarikh",
  "تاریخ",
  "reservation",
]);

const unwrapRetellPayload = (payload) => {
  if (
    payload &&
    typeof payload === "object" &&
    payload.args &&
    typeof payload.args === "object"
  ) {
    return payload.args;
  }

  return payload && typeof payload === "object" ? payload : {};
};

const normalizeFreeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[,_-]+/g, " ")
    .replace(/\s+/g, " ");

const RETELL_NULL_STRINGS = new Set(["null", "undefined", "none", "nil"]);

const toRetellString = (value) => {
  if (value === undefined || value === null) {
    return "";
  }

  const str = String(value).trim();
  return RETELL_NULL_STRINGS.has(str.toLowerCase()) ? "" : str;
};

const toRetellBoolean = (value) => (value ? "true" : "false");

const replaceDevanagariDigits = (value) =>
  String(value || "").replace(/[०-९۰-۹]/g, (digit) => DEVANAGARI_DIGIT_MAP[digit] || digit);

const normalizeNumericSpeechTokens = (value) =>
  replaceDevanagariDigits(value)
    .split(/\s+/)
    .map((token) => HINDI_TIME_NUMBER_ALIASES[token] || token)
    .join(" ");

const normalizeDateSpeechTokens = (value) =>
  replaceDevanagariDigits(value)
    .split(/\s+/)
    .map((token) => HINDI_DATE_NUMBER_ALIASES[token] || token)
    .join(" ");

const stripTrailingDateContextTokens = (normalizedValue) => {
  const tokens = String(normalizedValue || "")
    .split(" ")
    .filter(Boolean);

  while (tokens.length > 0 && DATE_CONTEXT_SUFFIX_TOKENS.has(tokens[tokens.length - 1])) {
    tokens.pop();
  }

  return tokens.join(" ");
};

const humanizeSeatingArea = (value) => {
  if (!value) {
    return "";
  }

  return HUMAN_SEATING_AREAS[value] || String(value).replace(/_/g, " ");
};

const humanizeVisitSummary = (value) => {
  if (!value) {
    return "";
  }

  return Object.entries(HUMAN_SEATING_AREAS).reduce(
    (summary, [area, humanLabel]) => summary.replaceAll(area, humanLabel),
    String(value)
  );
};

const normalizeSeatingPreference = (value) => {
  const normalized = normalizeFreeText(value);

  if (!normalized) {
    return "";
  }

  return SEATING_AREA_ALIASES[normalized] || normalized;
};

const normalizeRetryCount = (value) => {
  const parsed = Number.parseInt(String(value || "0"), 10);
  return Number.isNaN(parsed) || parsed < 0 ? 0 : parsed;
};

const incrementRetryCount = (value) => String(Math.min(normalizeRetryCount(value) + 1, 2));
const incrementTimeClarificationAttempts = (value) =>
  String(Math.min(normalizeRetryCount(value) + 1, 2));

const buildUtcDate = (dateString) => {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

const formatUtcDate = (date) => date.toISOString().slice(0, 10);

const addDays = (dateString, offset) => {
  const date = buildUtcDate(dateString);
  date.setUTCDate(date.getUTCDate() + offset);
  return formatUtcDate(date);
};

const formatDateForSpeech = (dateString) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    timeZone: appSettings.timezone,
  }).format(buildUtcDate(dateString));

const formatGuestCountForSpeech = (guestCount) => {
  const numeric = Number(guestCount);
  if (Number.isInteger(numeric) && numeric > 0) {
    return `${numeric} افراد`;
  }

  return `${toRetellString(guestCount)} افراد`;
};

const formatTimeForSpeech = (timeString) => {
  const normalized = normalizeTime(timeString);
  const [hourValue, minuteValue] = normalized.split(":");
  const hours = Number(hourValue);
  const minutes = Number(minuteValue);
  const twelveHour = hours % 12 || 12;
  let prefix = "صبح";

  if (hours === 0) {
    prefix = "رات";
  } else if (hours >= 1 && hours < 12) {
    prefix = "صبح";
  } else if (hours >= 12 && hours < 17) {
    prefix = "دوپہر";
  } else if (hours >= 17 && hours < 21) {
    prefix = "شام";
  } else {
    prefix = "رات";
  }

  if (minutes === 0) {
    return `${prefix} ${twelveHour} بجے`;
  }

  return `${prefix} ${twelveHour}:${String(minutes).padStart(2, "0")} بجے`;
};

const formatOperatingWindow = (operatingHour) => {
  if (
    !operatingHour ||
    operatingHour.isClosed ||
    !operatingHour.openTime ||
    !operatingHour.closeTime
  ) {
    return "";
  }

  return `${formatTimeForSpeech(operatingHour.openTime)} سے ${formatTimeForSpeech(
    operatingHour.closeTime
  )} تک`;
};

const pickSuggestedTimeWithinOperatingHours = (operatingHour) => {
  if (!operatingHour?.openTime || !operatingHour?.closeTime) {
    return "";
  }

  const preferredEveningTime = "19:00:00";
  return isTimeWithinOperatingHours(
    preferredEveningTime,
    appSettings.defaultReservationDurationMinutes,
    operatingHour
  )
    ? preferredEveningTime
    : operatingHour.openTime;
};

const buildClosedTimeMessage = (operatingHour, dateLabel = "اس دن", requestedTime = "") => {
  if (
    !operatingHour ||
    operatingHour.isClosed ||
    !operatingHour.openTime ||
    !operatingHour.closeTime
  ) {
    return `معذرت، ${dateLabel} ہمارا restaurant open نہیں ہوتا۔ اگر آپ چاہیں تو کسی اور دن کا وقت دیکھ لیتا ہوں۔`;
  }

  const requestedLabel = requestedTime ? `${formatTimeForSpeech(requestedTime)} ` : "اس وقت ";
  const suggestedTime = pickSuggestedTimeWithinOperatingHours(operatingHour);
  const suggestionLine = suggestedTime
    ? ` کیا آپ ${formatTimeForSpeech(suggestedTime)} یا اس کے بعد کا وقت دیکھنا چاہیں گے؟`
    : "";

  return `معذرت، ${requestedLabel}نئی ڈائننگ reservation ممکن نہیں ہوتی۔ ہماری timings ${formatOperatingWindow(
    operatingHour
  )} ہیں، اس لیے آخری مناسب وقت اس سے پہلے ہوتا ہے۔${suggestionLine}`;
};

const formatAlternativeAreas = (areas) =>
  Array.isArray(areas) && areas.length > 0
    ? areas.map((area) => humanizeSeatingArea(area)).join(", ")
    : "";

const formatAlternativeSlots = (slots) => {
  if (!Array.isArray(slots) || slots.length === 0) {
    return "";
  }

  return slots
    .map((slot) => {
      const area = humanizeSeatingArea(slot.matched_area);
      const reservationTime = slot.reservation_time
        ? formatTimeForSpeech(slot.reservation_time)
        : "";

      if (area && reservationTime) {
        return `${area} میں ${reservationTime}`;
      }

      return reservationTime || area;
    })
    .filter(Boolean)
    .join(", ");
};

const safeNormalizeCallerPhone = (value) => {
  try {
    return normalizePhoneToE164(value, appSettings.defaultPhoneCountry);
  } catch {
    return "";
  }
};

const buildAvailabilityErrorResponse = ({
  errorCode = "AVAILABILITY_ERROR",
  message,
  normalizedReservationTime = "",
  retryCount,
  shouldIncrementRetry = true,
  timeClarificationAttempts = "0",
  timeAmbiguous = false,
  timeResolutionStatus = "unresolved",
}) => ({
  alternative_areas: "",
  alternative_slots: "",
  availability_error: "true",
  availability_error_retry_count: shouldIncrementRetry
    ? incrementRetryCount(retryCount)
    : toRetellString(normalizeRetryCount(retryCount)),
  available: "false",
  error_code: errorCode,
  explanation: "",
  matched_area: "",
  normalized_reservation_time: normalizedReservationTime,
  success: "false",
  time_ambiguous: toRetellBoolean(timeAmbiguous),
  time_clarification_attempts: toRetellString(timeClarificationAttempts),
  time_resolution_status: timeResolutionStatus,
  user_safe_message:
    message ||
    "معذرت، ابھی booking check کرنے میں دقت ہو رہی ہے۔",
});

const buildLookupResponse = (customer, callerPhoneNumber) => ({
  caller_phone_number: toRetellString(callerPhoneNumber),
  customer_id: toRetellString(customer?.customer_id),
  customer_name: toRetellString(customer?.customer_name),
  is_returning_customer: toRetellBoolean(customer?.is_returning_customer),
  last_party_size: toRetellString(customer?.last_party_size),
  last_seating_area: humanizeSeatingArea(customer?.last_seating_area),
  last_visit_summary: humanizeVisitSummary(customer?.last_visit_summary),
  preferred_language: toRetellString(customer?.preferred_language),
  reception_number: toRetellString(
    customer?.reception_number || appSettings.receptionNumber
  ),
});

const withDiagnostics = (response, normalizedValues = {}) => ({
  ...response,
  __diagnostics: {
    normalized_values: normalizedValues,
  },
});

const getRequestedDurationMinutes = (value) => {
  const numericValue = Number(value);
  return Number.isInteger(numericValue) && numericValue > 0
    ? numericValue
    : appSettings.defaultReservationDurationMinutes;
};

const getOperatingHourForDate = async (dateString) => {
  if (!dateString) {
    return null;
  }

  return operatingHourDAO.findOperatingHourByDay(getDayOfWeek(dateString));
};

const getRelativeDateOffset = (normalized) => {
  if (!normalized) {
    return null;
  }

  if (RELATIVE_DATE_OFFSETS[normalized] !== undefined) {
    return RELATIVE_DATE_OFFSETS[normalized];
  }

  const stripped = normalized
    .split(" ")
    .filter((token) => token && !DATE_CONTEXT_SUFFIX_TOKENS.has(token))
    .join(" ")
    .trim();

  if (stripped && RELATIVE_DATE_OFFSETS[stripped] !== undefined) {
    return RELATIVE_DATE_OFFSETS[stripped];
  }

  const firstToken = (normalized.split(" ")[0] || "").trim();
  if (firstToken && RELATIVE_DATE_OFFSETS[firstToken] !== undefined) {
    return RELATIVE_DATE_OFFSETS[firstToken];
  }

  return null;
};

const hasCue = (normalizedText, tokenSet, cues) =>
  cues.some((cue) =>
    cue.includes(" ") ? normalizedText.includes(cue) : tokenSet.has(cue)
  );

const isTimeWithinOperatingHours = (candidateTime, durationMinutes, operatingHour) => {
  return resolveReservationWindow({
    operatingHour,
    requestedDurationMinutes: durationMinutes,
    startTime: candidateTime,
  }).allowed;
};

const parseSpokenDate = (value) => {
  const rawValue = String(value || "").trim();
  if (!rawValue || RETELL_NULL_STRINGS.has(rawValue.toLowerCase())) {
    return { kind: "empty", value: "" };
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
    return { kind: "ok", value: rawValue };
  }

  const normalized = normalizeFreeText(replaceDevanagariDigits(rawValue)).replace(
    /\b(\d{1,2})(st|nd|rd|th)\b/g,
    "$1"
  );
  const normalizedDateText = stripTrailingDateContextTokens(
    normalizeFreeText(normalizeDateSpeechTokens(normalized))
      .replace(/\b(\d{1,2})(st|nd|rd|th)\b/g, "$1"),
  );
  const today = getCurrentDateStringInTimezone(appSettings.timezone);

  const relativeOffset = getRelativeDateOffset(normalizedDateText);
  if (relativeOffset !== null) {
    return { kind: "ok", value: addDays(today, relativeOffset) };
  }

  const weekday = WEEKDAY_ALIASES[normalizedDateText];
  if (weekday !== undefined) {
    const todayDate = buildUtcDate(today);
    const todayWeekday = todayDate.getUTCDay();
    const offset = (weekday - todayWeekday + 7) % 7 || 7;
    return { kind: "ok", value: addDays(today, offset) };
  }

  const monthDayPatterns = [
    /^(\d{1,2})\s+([\p{L}\p{M}]+)(?:\s+(\d{4}))?$/u,
    /^([\p{L}\p{M}]+)\s+(\d{1,2})(?:\s+(\d{4}))?$/u,
  ];

  for (const pattern of monthDayPatterns) {
    const match = normalizedDateText.match(pattern);
    if (!match) continue;

    const monthName = Number.isNaN(Number(match[1])) ? match[1] : match[2];
    const dayValue = Number.isNaN(Number(match[1])) ? Number(match[2]) : Number(match[1]);
    const explicitYear = Number.isNaN(Number(match[1]))
      ? match[3]
      : match[3];
    const month = MONTH_ALIASES[monthName];

    if (!month || Number.isNaN(dayValue) || dayValue < 1 || dayValue > 31) {
      return { kind: "unknown", value: rawValue };
    }

    const currentYear = Number(today.slice(0, 4));
    let year = explicitYear ? Number(explicitYear) : currentYear;
    let candidate = `${year}-${String(month).padStart(2, "0")}-${String(dayValue).padStart(2, "0")}`;

    if (Number.isNaN(year)) {
      return { kind: "unknown", value: rawValue };
    }

    const date = buildUtcDate(candidate);
    if (
      Number(date.getUTCFullYear()) !== year ||
      date.getUTCMonth() + 1 !== month ||
      date.getUTCDate() !== dayValue
    ) {
      return { kind: "unknown", value: rawValue };
    }

    if (!explicitYear && candidate < today) {
      year += 1;
      candidate = `${year}-${String(month).padStart(2, "0")}-${String(dayValue).padStart(2, "0")}`;
    }

    return { kind: "ok", value: candidate };
  }

  return { kind: "unknown", value: rawValue };
};

const parseSpokenTime = (value) => {
  const rawValue = String(value || "").trim();
  if (!rawValue || RETELL_NULL_STRINGS.has(rawValue.toLowerCase())) {
    return { kind: "empty", value: "" };
  }

  if (/^\d{2}:\d{2}(:\d{2})?$/.test(rawValue)) {
    return { kind: "ok", resolution: "resolved", value: normalizeTime(rawValue) };
  }

  const normalized = normalizeNumericSpeechTokens(normalizeFreeText(rawValue))
    .replace(/(?:\b(?:baje|bajay|bjy|bje|bajae)\b|बजे|बजा|बजकर|بجے)/gu, " ")
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();

  let prefix = "";
  let hourToken = "";
  let minuteToken = "";
  let suffix = "";

  let match = normalized.match(/^(\d{1,2})(?::(\d{2}))?(?:\s+(.+))?$/);
  if (match) {
    [, hourToken, minuteToken = "", suffix = ""] = match;
  } else {
    match = normalized.match(/^(.+?)\s+(\d{1,2})(?::(\d{2}))?(?:\s+(.+))?$/);
    if (!match) {
      return { kind: "unknown", value: rawValue };
    }

    [, prefix = "", hourToken, minuteToken = "", suffix = ""] = match;
  }

  let hours = Number(hourToken);
  const minutes = minuteToken ? Number(minuteToken) : 0;
  const remainder = [prefix, suffix]
    .filter(Boolean)
    .map((part) => normalizeFreeText(part))
    .filter(Boolean)
    .join(" ")
    .trim();
  const tokens = remainder ? remainder.split(" ") : [];

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return { kind: "unknown", value: rawValue };
  }

  if (hours > 12 && !remainder) {
    return {
      kind: "ok",
      resolution: "resolved",
      value: normalizeTime(
        `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
      ),
    };
  }

  const tokenSet = new Set(tokens);
  const hasAm = hasCue(remainder, tokenSet, AM_TOKENS);
  const hasPm = hasCue(remainder, tokenSet, PM_TOKENS);
  const hasAfternoon = hasCue(remainder, tokenSet, AFTERNOON_TOKENS);
  const hasMidnight = hasCue(remainder, tokenSet, [
    "midnight",
    "aadhi raat",
    "आधी रात",
    "آدھی رات",
  ]);

  if ((hasAm && hasPm) || (hasAm && hasAfternoon) || (hasPm && hasAfternoon)) {
    return { kind: "unknown", value: rawValue };
  }

  if (!hasAm && !hasPm && !hasAfternoon) {
    const firstHour = hours === 12 ? 0 : hours;
    const secondHour = hours === 12 ? 12 : hours + 12;

    return {
      kind: "ambiguous",
      candidates: [
        normalizeTime(
          `${String(firstHour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
        ),
        normalizeTime(
          `${String(secondHour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
        ),
      ],
      value: rawValue,
    };
  }

  if (hours > 12) {
    return { kind: "unknown", value: rawValue };
  }

  if (hasAm) {
    hours = hours === 12 ? 0 : hours;
  } else if (hasMidnight) {
    hours = hours === 12 ? 0 : hours + 12;
  } else {
    hours = hours === 12 ? 12 : hours + 12;
  }

  return {
    kind: "ok",
    resolution: "resolved",
    value: normalizeTime(
      `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
    ),
  };
};

const buildTimeResolutionState = async ({
  durationMinutes,
  normalizedReservationTime,
  reservationDate,
  reservationTime,
  timeClarificationAttempts,
  timeResolutionStatus,
}) => {
  const rawTime = toRetellString(reservationTime).trim();
  const persistedNormalizedTime = toRetellString(normalizedReservationTime).trim();
  const persistedStatus = toRetellString(timeResolutionStatus).trim();
  const attempts = normalizeRetryCount(timeClarificationAttempts);
  const parsedDate = parseSpokenDate(reservationDate);
  const requestedDurationMinutes = getRequestedDurationMinutes(durationMinutes);

  if (!rawTime && persistedNormalizedTime && persistedStatus === "resolved") {
    return {
      availabilityError: false,
      normalizedTime: persistedNormalizedTime,
      timeAmbiguous: false,
      timeClarificationAttempts: "0",
      timeResolutionStatus: "resolved",
    };
  }

  const parsedTime = parseSpokenTime(rawTime);

  if (parsedTime.kind === "empty") {
    return {
      availabilityError: false,
      normalizedTime: persistedNormalizedTime,
      timeAmbiguous: false,
      timeClarificationAttempts: "0",
      timeResolutionStatus: persistedNormalizedTime ? "resolved" : "unresolved",
    };
  }

  if (parsedTime.kind === "unknown") {
    return {
      availabilityError: true,
      errorCode: "TIME_UNCLEAR",
      message: "معذرت، صرف وقت دوبارہ بتا دیں۔",
      normalizedTime: "",
      timeAmbiguous: false,
      timeClarificationAttempts: String(attempts),
      timeResolutionStatus: "unresolved",
    };
  }

  if (parsedTime.kind === "ok") {
    const operatingHour =
      parsedDate.kind === "ok" ? await getOperatingHourForDate(parsedDate.value) : null;

    if (
      parsedDate.kind === "ok" &&
      !isTimeWithinOperatingHours(
        parsedTime.value,
        requestedDurationMinutes,
        operatingHour
      )
    ) {
      return {
        availabilityError: false,
        closedTimeMessage: buildClosedTimeMessage(
          operatingHour,
          formatDateForSpeech(parsedDate.value),
          parsedTime.value
        ),
        normalizedTime: "",
        operatingHour,
        parsedDate,
        timeAmbiguous: false,
        timeClarificationAttempts: "0",
        timeResolutionStatus: "closed",
      };
    }

    return {
      availabilityError: false,
      normalizedTime: parsedTime.value,
      operatingHour,
      parsedDate,
      timeAmbiguous: false,
      timeClarificationAttempts: "0",
      timeResolutionStatus: "resolved",
    };
  }

  if (parsedDate.kind !== "ok") {
    return {
      availabilityError: true,
      errorCode: "TIME_AMBIGUOUS",
      message: "سات بجے صبح یا شام؟",
      normalizedTime: "",
      timeAmbiguous: true,
      timeClarificationAttempts: incrementTimeClarificationAttempts(attempts),
      timeResolutionStatus: "ambiguous",
    };
  }

  const operatingHour = await getOperatingHourForDate(parsedDate.value);
  const validCandidates = parsedTime.candidates.filter((candidate) =>
    isTimeWithinOperatingHours(candidate, requestedDurationMinutes, operatingHour)
  );

  if (validCandidates.length === 1) {
    return {
      availabilityError: false,
      normalizedTime: validCandidates[0],
      operatingHour,
      parsedDate,
      timeAmbiguous: false,
      timeClarificationAttempts: "0",
      timeResolutionStatus: "resolved",
    };
  }

  if (validCandidates.length === 0) {
    return {
      availabilityError: false,
      closedTimeMessage: buildClosedTimeMessage(
        operatingHour,
        formatDateForSpeech(parsedDate.value),
        parsedTime.candidates[0]
      ),
      normalizedTime: "",
      operatingHour,
      parsedDate,
      timeAmbiguous: false,
      timeClarificationAttempts: "0",
      timeResolutionStatus: "closed",
    };
  }

  return {
    availabilityError: true,
    errorCode: "TIME_AMBIGUOUS",
    message: "سات بجے صبح یا شام؟",
    normalizedTime: "",
    operatingHour,
    parsedDate,
    timeAmbiguous: true,
    timeClarificationAttempts: incrementTimeClarificationAttempts(attempts),
    timeResolutionStatus: "ambiguous",
  };
};

const normalizeAvailabilityPayload = async (payload) => {
  const args = unwrapRetellPayload(payload);
  const parsedDate = parseSpokenDate(args.reservation_date);
  const timeState = await buildTimeResolutionState({
    durationMinutes: args.duration_minutes,
    normalizedReservationTime: args.normalized_reservation_time,
    reservationDate: args.reservation_date,
    reservationTime: args.reservation_time,
    timeClarificationAttempts: args.time_clarification_attempts,
    timeResolutionStatus: args.time_resolution_status,
  });

  if (timeState.availabilityError) {
    return {
      ok: false,
      response: buildAvailabilityErrorResponse({
        errorCode: timeState.errorCode,
        message: timeState.message,
        normalizedReservationTime: timeState.normalizedTime,
        retryCount: args.availability_error_retry_count,
        shouldIncrementRetry: false,
        timeAmbiguous: timeState.timeAmbiguous,
        timeClarificationAttempts: timeState.timeClarificationAttempts,
        timeResolutionStatus: timeState.timeResolutionStatus,
      }),
    };
  }

  if (timeState.timeResolutionStatus === "closed") {
    return {
      ok: false,
      response: buildClosedTimeUnavailableResponse({
        message: timeState.closedTimeMessage,
        normalizedReservationTime: timeState.normalizedTime,
        timeResolutionStatus: timeState.timeResolutionStatus,
      }),
    };
  }

  if (parsedDate.kind === "unknown") {
    return {
      ok: false,
      response: buildAvailabilityErrorResponse({
        errorCode: "VALIDATION_ERROR",
        message: "معذرت، تاریخ دوبارہ بتا دیں۔",
        normalizedReservationTime: timeState.normalizedTime,
        retryCount: args.availability_error_retry_count,
        shouldIncrementRetry: false,
        timeAmbiguous: false,
        timeClarificationAttempts: timeState.timeClarificationAttempts,
        timeResolutionStatus: timeState.normalizedTime ? "resolved" : "unresolved",
      }),
    };
  }

  return {
    ok: true,
    retryCount: args.availability_error_retry_count,
    timeClarificationAttempts: timeState.timeClarificationAttempts,
    timeResolutionStatus: timeState.timeResolutionStatus,
    userSafeMessage: timeState.closedTimeMessage || "",
    value: {
      duration_minutes: args.duration_minutes,
      guest_count: args.guest_count,
      reservation_date:
        parsedDate.kind === "ok" ? parsedDate.value : toRetellString(args.reservation_date),
      reservation_time:
        timeState.normalizedTime || toRetellString(args.reservation_time),
      seating_preference: normalizeSeatingPreference(args.seating_preference),
    },
  };
};

const normalizeReservationPayload = async (payload) => {
  const args = unwrapRetellPayload(payload);
  const normalizedAvailability = await normalizeAvailabilityPayload({
    ...args,
    reservation_time: args.reservation_time || args.raw_reservation_time || "",
  });

  if (!normalizedAvailability.ok) {
    return normalizedAvailability;
  }

  const resolvedCustomerName = toRetellString(
    args.customer_name ||
      args.customer_name_candidate ||
      args.customer_profile_name
  );

  return {
    ok: true,
    retryCount: normalizedAvailability.retryCount,
    value: {
      ...normalizedAvailability.value,
      customer_name: resolvedCustomerName,
      phone_number: toRetellString(args.phone_number || args.caller_phone_number),
      preferred_language: toRetellString(args.preferred_language),
      source: "phone_agent",
      special_request: toRetellString(args.special_request),
    },
  };
};

const createLookupFailure = (error, callerPhoneNumber) => ({
  caller_phone_number: toRetellString(callerPhoneNumber),
  customer_id: "",
  customer_name: "",
  error_code: error?.code || "LOOKUP_ERROR",
  is_returning_customer: "false",
  last_party_size: "",
  last_seating_area: "",
  last_visit_summary: "",
  preferred_language: "",
  reception_number: toRetellString(appSettings.receptionNumber),
  success: "false",
  user_safe_message:
    "Returning customer details اس وقت load نہیں ہو سکیں، لیکن میں reservation میں آپ کی مدد کر سکتا ہوں۔",
});

const buildAvailabilitySuccess = ({
  availability,
  normalizedReservationTime = "",
  timeClarificationAttempts = "0",
  timeResolutionStatus = "resolved",
  userSafeMessage,
}) => ({
  alternative_areas: formatAlternativeAreas(availability.alternative_areas),
  alternative_slots: formatAlternativeSlots(availability.alternative_slots),
  availability_error: "false",
  availability_error_retry_count: "0",
  available: toRetellBoolean(availability.available),
  error_code: "",
  explanation: toRetellString(availability.explanation),
  matched_area: humanizeSeatingArea(availability.matched_area),
  normalized_reservation_time: normalizedReservationTime,
  success: "true",
  time_ambiguous: "false",
  time_clarification_attempts: toRetellString(timeClarificationAttempts),
  time_resolution_status: timeResolutionStatus,
  user_safe_message: availability.available
    ? ""
    : toRetellString(userSafeMessage || availability.explanation),
});

const buildClosedTimeUnavailableResponse = ({
  message,
  normalizedReservationTime = "",
  timeResolutionStatus = "closed",
}) => ({
  alternative_areas: "",
  alternative_slots: "",
  availability_error: "false",
  availability_error_retry_count: "0",
  available: "false",
  error_code: "",
  explanation: toRetellString(message),
  matched_area: "",
  normalized_reservation_time: normalizedReservationTime,
  success: "true",
  time_ambiguous: "false",
  time_clarification_attempts: "0",
  time_resolution_status: timeResolutionStatus,
  user_safe_message: toRetellString(message),
});

const buildUserSafeAvailabilityMessage = ({
  availability,
  operatingHour,
  requestedTime,
}) => {
  if (availability?.available) {
    return "";
  }

  const explanation = toRetellString(availability?.explanation);

  if (!explanation) {
    return "";
  }

  if (
    explanation.includes("outside Kaya's opening hours") ||
    explanation.includes("Kaya is closed on the requested day")
  ) {
    return buildClosedTimeMessage(operatingHour, "اس دن", requestedTime);
  }

  if (explanation.includes("No tables available")) {
    return "اس exact وقت پر table available نہیں ہے۔";
  }

  if (explanation.includes("Requested seating area")) {
    return "اس seating میں اس وقت table available نہیں ہے۔";
  }

  return "اس exact وقت پر table available نہیں ہے۔";
};

const buildCreateReservationFailure = (error, alternatives = null) => ({
  alternative_areas: formatAlternativeAreas(
    alternatives?.alternative_areas || error?.fieldErrors?.alternative_areas
  ),
  alternative_slots: formatAlternativeSlots(
    alternatives?.alternative_slots || error?.fieldErrors?.alternative_slots
  ),
  confirmation_text: "",
  error_code: error?.code || "RESERVATION_ERROR",
  reservation_id: "",
  success: "false",
  user_safe_message:
    error?.message ||
    "معذرت، ابھی booking مکمل نہیں ہو سکی۔",
});

const buildCreateReservationSuccess = (result) => ({
  alternative_areas: "",
  alternative_slots: "",
  confirmation_text: `جی، آپ کی booking confirm ہو گئی ہے۔ ${formatDateForSpeech(
    result.reservation.reservation_date
  )} کو ${formatTimeForSpeech(result.reservation.start_time)}، ${formatGuestCountForSpeech(
    result.reservation.guest_count
  )} کے لیے ${humanizeSeatingArea(result.reservation.seating_area)} table reserve کر دی گئی ہے۔`,
  error_code: "",
  reservation_id: toRetellString(result.reservation.id),
  success: "true",
  user_safe_message: "",
});

const buildInboundWebhookResponse = async (payload) => {
  const inboundPayload =
    payload && typeof payload === "object" && payload.call_inbound
      ? payload.call_inbound
      : payload;
  const callerNumber = safeNormalizeCallerPhone(
    inboundPayload?.from_number || inboundPayload?.from
  );

  let customer = null;
  if (callerNumber) {
    try {
      customer = await customerService.lookupCustomerByPhone(callerNumber);
    } catch {
      customer = null;
    }
  }

  const lookup = buildLookupResponse(customer, callerNumber);

  return withDiagnostics(
    {
    call_inbound: {
      dynamic_variables: {
        availability_error_retry_count: "0",
        caller_phone_number: lookup.caller_phone_number,
        customer_name: lookup.customer_name,
        is_returning_customer: lookup.is_returning_customer,
        last_party_size: lookup.last_party_size,
        last_seating_area: lookup.last_seating_area,
        last_visit_summary: lookup.last_visit_summary,
        normalized_reservation_time: "",
        preferred_language: lookup.preferred_language,
        reception_number: lookup.reception_number,
        time_ambiguous: "false",
        time_clarification_attempts: "0",
        time_resolution_status: "unresolved",
      },
      metadata: {
        customer_id: lookup.customer_id,
      },
    },
    },
    {
      caller_phone_number: lookup.caller_phone_number,
      customer_id: lookup.customer_id,
      customer_name: lookup.customer_name,
      is_returning_customer: lookup.is_returning_customer,
      reception_number: lookup.reception_number,
    }
  );
};

const lookupCustomerForRetell = async (payload) => {
  const args = unwrapRetellPayload(payload);
  const callerPhoneNumber = safeNormalizeCallerPhone(args.phone_number);

  try {
    const customer = callerPhoneNumber
      ? await customerService.lookupCustomerByPhone(callerPhoneNumber)
      : null;

    return withDiagnostics(
      {
      ...buildLookupResponse(customer, callerPhoneNumber),
      error_code: "",
      success: "true",
      user_safe_message: "",
      },
      {
        caller_phone_number: callerPhoneNumber,
        customer_id: customer?.customer_id || "",
        customer_name: customer?.customer_name || "",
        is_returning_customer: customer?.is_returning_customer || false,
        reception_number: customer?.reception_number || appSettings.receptionNumber,
      }
    );
  } catch (error) {
    return withDiagnostics(createLookupFailure(error, callerPhoneNumber), {
      caller_phone_number: callerPhoneNumber,
      error_code: error?.code || "LOOKUP_ERROR",
      reception_number: appSettings.receptionNumber,
    });
  }
};

const checkAvailabilityForRetell = async (payload) => {
  const normalized = await normalizeAvailabilityPayload(payload);

  if (!normalized.ok) {
    return withDiagnostics(normalized.response, {
      error_code: normalized.response.error_code,
      guest_count: toRetellString(unwrapRetellPayload(payload).guest_count),
      normalized_reservation_time: normalized.response.normalized_reservation_time,
      reservation_date: toRetellString(unwrapRetellPayload(payload).reservation_date),
      reservation_time: toRetellString(unwrapRetellPayload(payload).reservation_time),
      seating_preference: normalizeSeatingPreference(
        unwrapRetellPayload(payload).seating_preference
      ),
      time_resolution_status: normalized.response.time_resolution_status,
    });
  }

  try {
    const availability = await availabilityService.checkAvailability(normalized.value);
    const operatingHour = await getOperatingHourForDate(
      normalized.value.reservation_date
    );

    return withDiagnostics(
      buildAvailabilitySuccess({
      availability,
      normalizedReservationTime: normalized.value.reservation_time,
      timeClarificationAttempts: normalized.timeClarificationAttempts,
      timeResolutionStatus: normalized.timeResolutionStatus,
      userSafeMessage: buildUserSafeAvailabilityMessage({
        availability,
        operatingHour,
        requestedTime: normalized.value.reservation_time,
      }),
      }),
      {
        available: availability.available,
        guest_count: normalized.value.guest_count,
        matched_area: availability.matched_area || "",
        normalized_reservation_time: normalized.value.reservation_time,
        reservation_date: normalized.value.reservation_date,
        reservation_time: normalized.value.reservation_time,
        seating_preference: normalized.value.seating_preference,
        time_resolution_status: normalized.timeResolutionStatus,
      }
    );
  } catch (error) {
    return withDiagnostics(
      buildAvailabilityErrorResponse({
      errorCode: error instanceof AppError ? error.code : "AVAILABILITY_ERROR",
      message:
        error instanceof AppError
          ? error.message
          : "معذرت، ابھی booking check کرنے میں دقت ہو رہی ہے۔",
      normalizedReservationTime: "",
      retryCount: normalized.retryCount,
      timeAmbiguous: false,
      timeClarificationAttempts: normalized.timeClarificationAttempts,
      timeResolutionStatus: "error",
      }),
      {
        error_code: error instanceof AppError ? error.code : "AVAILABILITY_ERROR",
        guest_count: normalized.value.guest_count,
        reservation_date: normalized.value.reservation_date,
        reservation_time: normalized.value.reservation_time,
        seating_preference: normalized.value.seating_preference,
        time_resolution_status: "error",
      }
    );
  }
};

const createReservationForRetell = async (payload) => {
  const normalized = await normalizeReservationPayload(payload);

  if (!normalized.ok) {
    return withDiagnostics(
      buildCreateReservationFailure({
        code: "VALIDATION_ERROR",
        message: normalized.response.user_safe_message,
      }),
      {
        customer_name:
          toRetellString(unwrapRetellPayload(payload).customer_name) ||
          toRetellString(unwrapRetellPayload(payload).customer_name_candidate) ||
          toRetellString(unwrapRetellPayload(payload).customer_profile_name),
        error_code: "VALIDATION_ERROR",
        phone_number: toRetellString(unwrapRetellPayload(payload).phone_number),
        reservation_date: toRetellString(unwrapRetellPayload(payload).reservation_date),
        reservation_time:
          toRetellString(unwrapRetellPayload(payload).reservation_time) ||
          toRetellString(unwrapRetellPayload(payload).raw_reservation_time),
      }
    );
  }

  try {
    const result = await reservationService.createReservation(normalized.value);
    return withDiagnostics(buildCreateReservationSuccess(result), {
      customer_name: normalized.value.customer_name,
      guest_count: normalized.value.guest_count,
      phone_number: normalized.value.phone_number,
      reservation_date: normalized.value.reservation_date,
      reservation_id: result.reservation.id,
      reservation_time: normalized.value.reservation_time,
      seating_preference:
        result.reservation.seating_area || normalized.value.seating_preference,
    });
  } catch (error) {
    if (
      error instanceof AppError &&
      error.code === "UNAVAILABLE_SLOT"
    ) {
      try {
        const alternatives = await availabilityService.checkAvailability(
          normalized.value
        );
        return withDiagnostics(buildCreateReservationFailure(error, alternatives), {
          customer_name: normalized.value.customer_name,
          error_code: error.code,
          guest_count: normalized.value.guest_count,
          phone_number: normalized.value.phone_number,
          reservation_date: normalized.value.reservation_date,
          reservation_time: normalized.value.reservation_time,
          seating_preference: normalized.value.seating_preference,
        });
      } catch {
        return withDiagnostics(buildCreateReservationFailure(error), {
          customer_name: normalized.value.customer_name,
          error_code: error.code,
          guest_count: normalized.value.guest_count,
          phone_number: normalized.value.phone_number,
          reservation_date: normalized.value.reservation_date,
          reservation_time: normalized.value.reservation_time,
          seating_preference: normalized.value.seating_preference,
        });
      }
    }

    return withDiagnostics(
      buildCreateReservationFailure(error instanceof AppError ? error : null),
      {
        customer_name: normalized.value.customer_name,
        error_code: error instanceof AppError ? error.code : "RESERVATION_ERROR",
        guest_count: normalized.value.guest_count,
        phone_number: normalized.value.phone_number,
        reservation_date: normalized.value.reservation_date,
        reservation_time: normalized.value.reservation_time,
        seating_preference: normalized.value.seating_preference,
      }
    );
  }
};

module.exports = {
  buildInboundWebhookResponse,
  checkAvailabilityForRetell,
  createReservationForRetell,
  lookupCustomerForRetell,
};
