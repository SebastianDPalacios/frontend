export const toDateInputValue = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const toMonthInputValue = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

export const parseInputDate = (value) => {
  const [year, month, day] = String(value || toDateInputValue()).split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const getIsoWeekInputValue = (date = new Date()) => {
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayNumber = (target.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNumber + 3);

  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const firstThursdayDay = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstThursdayDay + 3);

  const weekNumber = 1 + Math.round((target - firstThursday) / (7 * 24 * 60 * 60 * 1000));
  return `${target.getFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
};

export const getWeekRange = (weekValue) => {
  const [yearText, weekText] = String(weekValue || getIsoWeekInputValue()).split("-W");
  const year = Number(yearText);
  const week = Number(weekText);
  const jan4 = new Date(year, 0, 4);
  const jan4Day = (jan4.getDay() + 6) % 7;
  const from = new Date(jan4);
  from.setDate(jan4.getDate() - jan4Day + (week - 1) * 7);

  const to = new Date(from);
  to.setDate(from.getDate() + 6);

  return { from: toDateInputValue(from), to: toDateInputValue(to) };
};

export const getMonthRange = (monthValue) => {
  const [year, month] = String(monthValue || toMonthInputValue()).split("-").map(Number);
  return {
    from: toDateInputValue(new Date(year, month - 1, 1)),
    to: toDateInputValue(new Date(year, month, 0)),
  };
};

export const getFortnightRange = (monthValue, half) => {
  const [year, month] = String(monthValue || toMonthInputValue()).split("-").map(Number);
  const isSecondHalf = String(half) === "2";
  return {
    from: toDateInputValue(new Date(year, month - 1, isSecondHalf ? 16 : 1)),
    to: toDateInputValue(new Date(year, month - 1, isSecondHalf ? new Date(year, month, 0).getDate() : 15)),
  };
};

export const getSemesterRange = (yearValue, half) => {
  const year = Number(yearValue || new Date().getFullYear());
  const startMonth = String(half) === "2" ? 6 : 0;
  return {
    from: toDateInputValue(new Date(year, startMonth, 1)),
    to: toDateInputValue(new Date(year, startMonth + 6, 0)),
  };
};

export const getPeriodRange = (period, controls) => {
  if (period === "weekly") {
    return getWeekRange(controls.week);
  }

  if (period === "fortnight") {
    return getFortnightRange(controls.fortnightMonth, controls.fortnightHalf);
  }

  if (period === "monthly") {
    return getMonthRange(controls.month);
  }

  if (period === "semester") {
    return getSemesterRange(controls.semesterYear, controls.semesterHalf);
  }

  return {
    from: controls.day,
    to: controls.day,
  };
};
