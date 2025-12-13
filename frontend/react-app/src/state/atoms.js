import { atom } from 'recoil';
import moment from 'moment';

export const eventsState = atom({
  key: 'eventsState',
  default: [],
});

export const venuesState = atom({
  key: 'venuesState',
  default: [],
});

export const aiModalOpenState = atom({
  key: 'aiModalOpenState',
  default: false,
});

export const aiModalEventState = atom({
  key: 'aiModalEventState',
  default: null,
});

export const currentDayState = atom({
  key: 'currentDayState',
  default: moment(new Date()),
});

export const timeGroupingModeState = atom({
  key: 'timeGroupingModeState',
  default: 'day',
});
