export const CLEANING_BUFFER_MINUTES = 60;
export const HOLD_TTL_MINUTES = 15;
export const GST_RATE = 0.12;

const IST_OFFSET = "+05:30";

/**
 * Pad numeric values to two digits.
 */
const pad2 = (n) => String(n).padStart(2, "0");

/**
 * Parse a YYYY-MM-DD string into integer year, month (1-12), and day components.
 */
export const parseYmd = (dateStr) => {
  const match = String(dateStr || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() + 1 !== month ||
    check.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
};

/**
 * Format Y/M/D parts to YYYY-MM-DD.
 */
export const formatYmd = ({ year, month, day }) =>
  `${year}-${pad2(month)}-${pad2(day)}`;

/**
 * Return today's date string in Asia/Kolkata as YYYY-MM-DD.
 */
export const getTodayIstYmd = () => {
  const now = new Date();
  const istMs = now.getTime() + 330 * 60 * 1000;
  const d = new Date(istMs);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
};

/**
 * Add calendar days safely in UTC math on YMD tuple.
 */
export const addCalendarDays = (dateStr, days) => {
  const parts = parseYmd(dateStr);
  if (!parts) return null;
  const dt = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return formatYmd({
    year: dt.getUTCFullYear(),
    month: dt.getUTCMonth() + 1,
    day: dt.getUTCDate(),
  });
};

/**
 * Add calendar months with deterministic month-end clamping
 * (e.g., Jan 31 + 1 month -> Feb 28/29).
 */
export const addCalendarMonths = (dateStr, months) => {
  const parts = parseYmd(dateStr);
  if (!parts) return null;
  const totalMonths = (parts.month - 1) + months;
  const targetYear = parts.year + Math.floor(totalMonths / 12);
  const targetMonthIndex = ((totalMonths % 12) + 12) % 12; // 0..11
  const lastDayOfTargetMonth = new Date(
    Date.UTC(targetYear, targetMonthIndex + 1, 0)
  ).getUTCDate();
  const clampedDay = Math.min(parts.day, lastDayOfTargetMonth);

  return formatYmd({
    year: targetYear,
    month: targetMonthIndex + 1,
    day: clampedDay,
  });
};

/**
 * Add calendar years with leap-day clamping (Feb 29 + 1 year -> Feb 28).
 */
export const addCalendarYears = (dateStr, years) =>
  addCalendarMonths(dateStr, years * 12);

/**
 * Parse HH:MM (24h) string into total minutes from midnight.
 */
export const parseTimeToMinutes = (timeStr) => {
  const match = String(timeStr || "").trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

const minutesToTimeStr = (mins) =>
  `${pad2(Math.floor(mins / 60))}:${pad2(mins % 60)}`;

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/**
 * Authoritative Stayzy multi-duration pricing & calendar engine.
 * Supports HOURLY, DAILY, WEEKLY, MONTHLY, YEARLY (with Month-1 + 11 schedules).
 */
export const calculateBookingPricing = ({
  ratePlan,
  durationType,
  durationCount,
  startDateStr,
  startTimeStr = "10:00",
  includeFood = false,
}) => {
  const fail = (error) => ({ success: false, error });

  if (!ratePlan) {
    return fail(`Duration "${durationType}" is not offered for this room.`);
  }
  const isEnabled = ratePlan.isEnabled ?? ratePlan.is_enabled ?? true;
  if (!isEnabled) {
    return fail(`Duration "${durationType}" is currently disabled for this room.`);
  }

  const normalizedType = String(durationType || "").toUpperCase();
  const count = Number(durationCount);
  if (!Number.isInteger(count) || count < 1) {
    return fail("Duration count must be a positive whole number.");
  }

  const minDuration = Number(ratePlan.minDuration ?? ratePlan.min_duration ?? 1);
  const maxDuration =
    ratePlan.maxDuration !== undefined && ratePlan.maxDuration !== null
      ? Number(ratePlan.maxDuration)
      : ratePlan.max_duration !== undefined && ratePlan.max_duration !== null
        ? Number(ratePlan.max_duration)
        : null;

  if (count < minDuration) {
    return fail(
      `Minimum ${normalizedType.toLowerCase()} duration is ${minDuration}.`
    );
  }
  if (maxDuration !== null && count > maxDuration) {
    return fail(
      `Maximum ${normalizedType.toLowerCase()} duration is ${maxDuration}.`
    );
  }

  const parsedStart = parseYmd(startDateStr);
  if (!parsedStart) {
    return fail("startDate must be a valid YYYY-MM-DD date.");
  }

  const unitPrice = Number(ratePlan.price || 0);
  const depositAmount = Number(ratePlan.depositAmount ?? ratePlan.deposit_amount ?? 0);
  const foodMonthlyCharge = Number(
    ratePlan.foodMonthlyCharge ?? ratePlan.food_monthly_charge ?? 0
  );

  let checkInDate = startDateStr;
  let checkOutDate = startDateStr;
  let startDateTime;
  let endDateTime;

  if (normalizedType === "HOURLY") {
    const startMins = parseTimeToMinutes(startTimeStr || "10:00");
    if (startMins === null) {
      return fail("startTime must be a valid HH:MM 24-hour time for HOURLY stays.");
    }

    const allowedStartMins =
      parseTimeToMinutes(ratePlan.allowedHoursStart ?? ratePlan.allowed_hours_start ?? "08:00") ??
      8 * 60;
    const allowedEndMins =
      parseTimeToMinutes(ratePlan.allowedHoursEnd ?? ratePlan.allowed_hours_end ?? "22:00") ??
      22 * 60;

    const endMins = startMins + count * 60;
    if (startMins < allowedStartMins || endMins > allowedEndMins) {
      return fail(
        `Hourly stays are permitted only between ${minutesToTimeStr(allowedStartMins)} and ${minutesToTimeStr(allowedEndMins)}.`
      );
    }

    checkOutDate = checkInDate;
    startDateTime = new Date(`${checkInDate}T${minutesToTimeStr(startMins)}:00${IST_OFFSET}`);
    endDateTime = new Date(`${checkInDate}T${minutesToTimeStr(endMins)}:00${IST_OFFSET}`);
  } else if (normalizedType === "DAILY") {
    checkOutDate = addCalendarDays(checkInDate, count);
    startDateTime = new Date(`${checkInDate}T12:00:00${IST_OFFSET}`);
    endDateTime = new Date(`${checkOutDate}T11:00:00${IST_OFFSET}`);
  } else if (normalizedType === "WEEKLY") {
    checkOutDate = addCalendarDays(checkInDate, count * 7);
    startDateTime = new Date(`${checkInDate}T12:00:00${IST_OFFSET}`);
    endDateTime = new Date(`${checkOutDate}T11:00:00${IST_OFFSET}`);
  } else if (normalizedType === "MONTHLY") {
    checkOutDate = addCalendarMonths(checkInDate, count);
    startDateTime = new Date(`${checkInDate}T12:00:00${IST_OFFSET}`);
    endDateTime = new Date(`${checkOutDate}T11:00:00${IST_OFFSET}`);
  } else if (normalizedType === "YEARLY") {
    checkOutDate = addCalendarYears(checkInDate, count);
    startDateTime = new Date(`${checkInDate}T12:00:00${IST_OFFSET}`);
    endDateTime = new Date(`${checkOutDate}T11:00:00${IST_OFFSET}`);
  } else {
    return fail(`Unsupported durationType "${normalizedType}".`);
  }

  let baseAmount = 0;
  let foodAmount = 0;
  let taxes = 0;
  let totalAmount = 0;
  let payableNow = 0;
  let balanceRemaining = 0;
  const schedule = [];

  if (normalizedType === "YEARLY") {
    // Rate plan price on YEARLY represents the annual base tariff per year
    const totalMonths = count * 12;
    baseAmount = round2(unitPrice * count);
    foodAmount = includeFood && foodMonthlyCharge > 0 ? round2(foodMonthlyCharge * totalMonths) : 0;
    taxes = round2((baseAmount + foodAmount) * GST_RATE);
    totalAmount = round2(baseAmount + foodAmount + taxes + depositAmount);

    const rentPlusFoodAndTax = round2(baseAmount + foodAmount + taxes);
    const installmentAmount = round2(rentPlusFoodAndTax / totalMonths);
    const firstInstallment = round2(rentPlusFoodAndTax - installmentAmount * (totalMonths - 1));

    payableNow = round2(firstInstallment + depositAmount);
    balanceRemaining = round2(Math.max(0, totalAmount - payableNow));

    for (let m = 1; m < totalMonths; m++) {
      const dueDate = addCalendarMonths(checkInDate, m);
      schedule.push({
        installmentNumber: m + 1,
        dueDate,
        amount: installmentAmount,
        description: `Month ${m + 1} Lease Installment${includeFood && foodMonthlyCharge > 0 ? " + Dining Plan" : ""}`,
        status: "PENDING",
      });
    }
  } else {
    baseAmount = round2(unitPrice * count);
    if (includeFood && foodMonthlyCharge > 0) {
      if (normalizedType === "MONTHLY") {
        foodAmount = round2(foodMonthlyCharge * count);
      } else if (normalizedType === "WEEKLY") {
        foodAmount = round2((foodMonthlyCharge / 4) * count);
      } else if (normalizedType === "DAILY") {
        foodAmount = round2((foodMonthlyCharge / 30) * count);
      }
    }
    const subtotal = round2(baseAmount + foodAmount);
    taxes = round2(subtotal * GST_RATE);
    totalAmount = round2(subtotal + taxes + depositAmount);
    payableNow = totalAmount;
    balanceRemaining = 0;
  }

  const unitLabel =
    normalizedType === "HOURLY"
      ? "/ hour"
      : normalizedType === "DAILY"
        ? "/ day"
        : normalizedType === "WEEKLY"
          ? "/ week"
          : normalizedType === "MONTHLY"
            ? "/ month"
            : "/ year";

  return {
    success: true,
    breakdown: {
      unitLabel,
      durationType: normalizedType,
      durationCount: count,
      unitPrice,
      baseAmount,
      foodAmount,
      foodCharge: foodAmount,
      taxes,
      gstRatePercent: Math.round(GST_RATE * 100),
      depositAmount,
      totalAmount,
      payableNow,
      balanceRemaining,
      checkInDate,
      checkOutDate,
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime.toISOString(),
      schedule,
    },
  };
};

/**
 * Tiered cancellation refund policy:
 * - >48 hours before check-in: 100% of total paid
 * - 24-48 hours before check-in: 50% of base rent portion + 100% of deposit (capped by amount paid)
 * - <24 hours before check-in: 100% of deposit only (capped by amount paid)
 */
export const calculateTieredRefund = ({
  startTime,
  paidAmount,
  basePrice = 0,
  depositAmount = 0,
  now = new Date(),
}) => {
  const paid = Math.max(0, Number(paidAmount || 0));
  if (paid <= 0) {
    return {
      refundAmount: 0,
      policyTier: "UNPAID_NO_REFUND",
      hoursUntilCheckIn: 0,
    };
  }

  const startMs = new Date(startTime).getTime();
  const hoursUntilCheckIn = (startMs - now.getTime()) / (1000 * 60 * 60);
  const deposit = Math.max(0, Number(depositAmount || 0));
  const base = Math.max(0, Number(basePrice || 0));

  if (hoursUntilCheckIn > 48) {
    return {
      refundAmount: round2(paid),
      policyTier: "FULL_OVER_48H",
      hoursUntilCheckIn: round2(hoursUntilCheckIn),
    };
  }

  if (hoursUntilCheckIn >= 24) {
    const raw = round2(base * 0.5 + deposit);
    const refundAmount = round2(Math.min(paid, raw > 0 ? raw : paid * 0.5));
    return {
      refundAmount,
      policyTier: "PARTIAL_24_TO_48H",
      hoursUntilCheckIn: round2(hoursUntilCheckIn),
    };
  }

  const refundAmount = round2(Math.min(paid, deposit));
  return {
    refundAmount,
    policyTier: "DEPOSIT_ONLY_UNDER_24H",
    hoursUntilCheckIn: round2(hoursUntilCheckIn),
  };
};

export default {
  CLEANING_BUFFER_MINUTES,
  HOLD_TTL_MINUTES,
  GST_RATE,
  parseYmd,
  formatYmd,
  getTodayIstYmd,
  addCalendarDays,
  addCalendarMonths,
  addCalendarYears,
  parseTimeToMinutes,
  calculateBookingPricing,
  calculateTieredRefund,
};
