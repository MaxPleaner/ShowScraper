// Date formatting helpers shared across views. All functions are pure and stateless.

// The format of the dates in the JSON files
// const FILE_DATE_FORMAT = 'MM-DD-YYYY';

// Note: intentionally omitting year here, see comment in GcsDataLoader.js
export const FILE_DATE_FORMAT = 'MM-DD';

// Format for a single day
export const SINGLE_DAY_FORMAT = 'M/DD (dddd)';

// Format when a date is shown in a range
export const WEEK_DAY_FORMAT = 'M/DD';

// Date label helpers
export const currentDateEntryDay = (currentDay) => currentDay.format(SINGLE_DAY_FORMAT);

export const currentDateEntryWeek = (currentDay) => {
  const nextWeek = currentDay.clone().add(7, 'days');
  return `${currentDay.format(WEEK_DAY_FORMAT)} to ${nextWeek.format(WEEK_DAY_FORMAT)}`;
};

export const currentDateEntry = (currentDay, mode) => (
  mode === 'week' ? currentDateEntryWeek(currentDay) : currentDateEntryDay(currentDay)
);

export const nextDateEntryDay = (currentDay) => currentDay.clone().add(1, 'days').format(SINGLE_DAY_FORMAT);

export const nextDateEntryWeek = (currentDay) => {
  const nextWeek = currentDay.clone().add(7, 'days');
  const nextWeek2 = currentDay.clone().add(14, 'days');
  return `${nextWeek.format(WEEK_DAY_FORMAT)} to ${nextWeek2.format(WEEK_DAY_FORMAT)}`;
};

export const nextDateEntry = (currentDay, mode) => (
  mode === 'week' ? nextDateEntryWeek(currentDay) : nextDateEntryDay(currentDay)
);

export const prevDateEntryDay = (currentDay) => currentDay.clone().add(-1, 'days').format(SINGLE_DAY_FORMAT);

export const prevDateEntryWeek = (currentDay) => {
  const nextWeek = currentDay.clone().add(-7, 'days');
  const nextWeek2 = currentDay.clone();
  return `${nextWeek.format(WEEK_DAY_FORMAT)} to ${nextWeek2.format(WEEK_DAY_FORMAT)}`;
};

export const prevDateEntry = (currentDay, mode) => (
  mode === 'week' ? prevDateEntryWeek(currentDay) : prevDateEntryDay(currentDay)
);

export const nextDateDay = (currentDay) => currentDay.clone().add(1, 'days');
export const nextDateWeek = (currentDay) => currentDay.clone().add(7, 'days');
export const nextDate = (currentDay, mode) => (
  mode === 'week' ? nextDateWeek(currentDay) : nextDateDay(currentDay)
);

export const prevDateDay = (currentDay) => currentDay.clone().add(-1, 'days');
export const prevDateWeek = (currentDay) => currentDay.clone().add(-7, 'days');
export const prevDate = (currentDay, mode) => (
  mode === 'week' ? prevDateWeek(currentDay) : prevDateDay(currentDay)
);
