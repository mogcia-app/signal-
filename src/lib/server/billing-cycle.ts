import type { UserProfile } from "@/types/user";

const DEFAULT_TIMEZONE = "Asia/Tokyo";

type DateLike =
  | Date
  | string
  | number
  | {
      toDate?: () => Date;
      seconds?: number;
      nanoseconds?: number;
    }
  | null
  | undefined;

const toDate = (value: DateLike): Date | null => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === "object") {
    if (typeof value.toDate === "function") {
      const date = value.toDate();
      return Number.isNaN(date.getTime()) ? null : date;
    }
    if (typeof value.seconds === "number") {
      const millis =
        value.seconds * 1000 + (typeof value.nanoseconds === "number" ? value.nanoseconds / 1_000_000 : 0);
      const date = new Date(millis);
      return Number.isNaN(date.getTime()) ? null : date;
    }
  }

  return null;
};

const normalizeTimezone = (timezone: string | undefined): string => {
  const candidate = String(timezone || "").trim() || DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat("ja-JP", { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return DEFAULT_TIMEZONE;
  }
};

const getDatePartsInTimezone = (date: Date, timezone: string): { year: number; month: number; day: number } => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = Number(parts.find((part) => part.type === "year")?.value || "1970");
  const month = Number(parts.find((part) => part.type === "month")?.value || "1");
  const day = Number(parts.find((part) => part.type === "day")?.value || "1");
  return { year, month, day };
};

const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month, 0).getDate();
};

const shiftMonth = (year: number, month: number, diff: number): { year: number; month: number } => {
  const date = new Date(year, month - 1 + diff, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
};

const parseOffsetMinutes = (offsetLabel: string): number => {
  const normalized = offsetLabel.replace("UTC", "GMT");
  const match = normalized.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/i);
  if (!match) {
    return 0;
  }

  const sign = match[1] === "-" ? -1 : 1;
  const hour = Number(match[2] || 0);
  const minute = Number(match[3] || 0);
  return sign * (hour * 60 + minute);
};

const getTimezoneOffsetMinutes = (date: Date, timezone: string): number => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "shortOffset",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const tzName = parts.find((part) => part.type === "timeZoneName")?.value || "GMT+00:00";
  return parseOffsetMinutes(tzName);
};

const zonedStartOfDayToUtc = (year: number, month: number, day: number, timezone: string): Date => {
  const probeUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const offsetMinutes = getTimezoneOffsetMinutes(probeUtc, timezone);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - offsetMinutes * 60 * 1000);
};

const resolveAnchorDay = (userProfile: UserProfile | null | undefined, timezone: string): number => {
  const createdAt = toDate(userProfile?.createdAt);
  const contractStartDate = toDate(userProfile?.contractStartDate);
  const anchorSource = createdAt || contractStartDate;
  if (!anchorSource) {
    return 1;
  }

  const { day } = getDatePartsInTimezone(anchorSource, timezone);
  return Math.min(Math.max(day, 1), 31);
};

const resolveCycleStartByDay = (
  now: Date,
  timezone: string,
  anchorDay: number
): { year: number; month: number; day: number } => {
  const nowParts = getDatePartsInTimezone(now, timezone);
  const currentMonthAnchorDay = Math.min(anchorDay, getDaysInMonth(nowParts.year, nowParts.month));

  if (nowParts.day >= currentMonthAnchorDay) {
    return {
      year: nowParts.year,
      month: nowParts.month,
      day: currentMonthAnchorDay,
    };
  }

  const prev = shiftMonth(nowParts.year, nowParts.month, -1);
  const prevMonthAnchorDay = Math.min(anchorDay, getDaysInMonth(prev.year, prev.month));
  return {
    year: prev.year,
    month: prev.month,
    day: prevMonthAnchorDay,
  };
};

const monthKey = (year: number, month: number): string => {
  return `${year}-${String(month).padStart(2, "0")}`;
};

const parseMonthKey = (value: string): { year: number; month: number } | null => {
  const match = value.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null;
  }
  return { year, month };
};

export function getBillingCycleContext(params: {
  userProfile: UserProfile | null | undefined;
  now?: Date;
}): {
  timezone: string;
  anchorDay: number;
  current: {
    key: string;
    start: Date;
    endExclusive: Date;
  };
  previous: {
    key: string;
    start: Date;
    endExclusive: Date;
  };
} {
  const now = params.now || new Date();
  const timezone = normalizeTimezone(params.userProfile?.timezone);
  const anchorDay = resolveAnchorDay(params.userProfile, timezone);

  const currentStartLocal = resolveCycleStartByDay(now, timezone, anchorDay);
  const nextStartMonth = shiftMonth(currentStartLocal.year, currentStartLocal.month, 1);
  const nextStartDay = Math.min(anchorDay, getDaysInMonth(nextStartMonth.year, nextStartMonth.month));
  const previousStartMonth = shiftMonth(currentStartLocal.year, currentStartLocal.month, -1);
  const previousStartDay = Math.min(anchorDay, getDaysInMonth(previousStartMonth.year, previousStartMonth.month));

  const currentStart = zonedStartOfDayToUtc(
    currentStartLocal.year,
    currentStartLocal.month,
    currentStartLocal.day,
    timezone
  );
  const currentEndExclusive = zonedStartOfDayToUtc(
    nextStartMonth.year,
    nextStartMonth.month,
    nextStartDay,
    timezone
  );
  const previousStart = zonedStartOfDayToUtc(
    previousStartMonth.year,
    previousStartMonth.month,
    previousStartDay,
    timezone
  );

  return {
    timezone,
    anchorDay,
    current: {
      key: monthKey(currentStartLocal.year, currentStartLocal.month),
      start: currentStart,
      endExclusive: currentEndExclusive,
    },
    previous: {
      key: monthKey(previousStartMonth.year, previousStartMonth.month),
      start: previousStart,
      endExclusive: currentStart,
    },
  };
}

export function getBillingCycleRangeForMonthKey(params: {
  userProfile: UserProfile | null | undefined;
  monthKey: string;
}): {
  timezone: string;
  anchorDay: number;
  key: string;
  start: Date;
  endExclusive: Date;
  previousKey: string;
  previousStart: Date;
  previousEndExclusive: Date;
} {
  const timezone = normalizeTimezone(params.userProfile?.timezone);
  const anchorDay = resolveAnchorDay(params.userProfile, timezone);
  const parsed = parseMonthKey(params.monthKey);
  const fallback = getBillingCycleContext({ userProfile: params.userProfile });

  if (!parsed) {
    return {
      timezone: fallback.timezone,
      anchorDay: fallback.anchorDay,
      key: fallback.current.key,
      start: fallback.current.start,
      endExclusive: fallback.current.endExclusive,
      previousKey: fallback.previous.key,
      previousStart: fallback.previous.start,
      previousEndExclusive: fallback.previous.endExclusive,
    };
  }

  const clampedCurrentDay = Math.min(anchorDay, getDaysInMonth(parsed.year, parsed.month));
  const next = shiftMonth(parsed.year, parsed.month, 1);
  const prev = shiftMonth(parsed.year, parsed.month, -1);
  const clampedNextDay = Math.min(anchorDay, getDaysInMonth(next.year, next.month));
  const clampedPrevDay = Math.min(anchorDay, getDaysInMonth(prev.year, prev.month));

  const start = zonedStartOfDayToUtc(parsed.year, parsed.month, clampedCurrentDay, timezone);
  const endExclusive = zonedStartOfDayToUtc(next.year, next.month, clampedNextDay, timezone);
  const previousStart = zonedStartOfDayToUtc(prev.year, prev.month, clampedPrevDay, timezone);

  return {
    timezone,
    anchorDay,
    key: monthKey(parsed.year, parsed.month),
    start,
    endExclusive,
    previousKey: monthKey(prev.year, prev.month),
    previousStart,
    previousEndExclusive: start,
  };
}
