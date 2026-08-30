// US federal holidays + Catholic observances for a given year.
// No external deps — Easter computed via Meeus/Jones/Butcher; movable feasts derived.

export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
  kind: 'federal' | 'catholic';
}

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// nth weekday of a month. weekday: 0=Sun..6=Sat. n: 1..5. Returns YYYY-MM-DD.
function nthWeekday(year: number, month: number, weekday: number, n: number): string {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const offset = (weekday - first + 7) % 7;
  const day = 1 + offset + (n - 1) * 7;
  return iso(year, month, day);
}

// Last given weekday of a month.
function lastWeekday(year: number, month: number, weekday: number): string {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lastDow = new Date(Date.UTC(year, month - 1, lastDay)).getUTCDay();
  const offset = (lastDow - weekday + 7) % 7;
  return iso(year, month, lastDay - offset);
}

// Gregorian Easter (Meeus/Jones/Butcher).
function easter(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(d: Date, n: number): string {
  const nd = new Date(d);
  nd.setUTCDate(nd.getUTCDate() + n);
  return iso(nd.getUTCFullYear(), nd.getUTCMonth() + 1, nd.getUTCDate());
}

export function getHolidays(year: number): Holiday[] {
  const e = easter(year);

  const federal: Holiday[] = [
    { date: iso(year, 1, 1), name: "New Year's Day", kind: 'federal' },
    { date: nthWeekday(year, 1, 1, 3), name: 'Martin Luther King Jr. Day', kind: 'federal' },
    { date: nthWeekday(year, 2, 1, 3), name: "Presidents' Day", kind: 'federal' },
    { date: lastWeekday(year, 5, 1), name: 'Memorial Day', kind: 'federal' },
    { date: iso(year, 6, 19), name: 'Juneteenth', kind: 'federal' },
    { date: iso(year, 7, 4), name: 'Independence Day', kind: 'federal' },
    { date: nthWeekday(year, 9, 1, 1), name: 'Labor Day', kind: 'federal' },
    { date: nthWeekday(year, 10, 1, 2), name: 'Columbus Day', kind: 'federal' },
    { date: iso(year, 11, 11), name: 'Veterans Day', kind: 'federal' },
    { date: nthWeekday(year, 11, 4, 4), name: 'Thanksgiving', kind: 'federal' },
    { date: iso(year, 12, 25), name: 'Christmas Day', kind: 'federal' },
  ];

  const catholic: Holiday[] = [
    { date: iso(year, 1, 1), name: 'Solemnity of Mary, Mother of God', kind: 'catholic' },
    { date: iso(year, 1, 6), name: 'Epiphany', kind: 'catholic' },
    { date: addDays(e, -46), name: 'Ash Wednesday', kind: 'catholic' },
    { date: addDays(e, -7), name: 'Palm Sunday', kind: 'catholic' },
    { date: addDays(e, -3), name: 'Holy Thursday', kind: 'catholic' },
    { date: addDays(e, -2), name: 'Good Friday', kind: 'catholic' },
    { date: addDays(e, 0), name: 'Easter Sunday', kind: 'catholic' },
    { date: addDays(e, 39), name: 'Ascension of the Lord', kind: 'catholic' },
    { date: addDays(e, 49), name: 'Pentecost', kind: 'catholic' },
    { date: iso(year, 8, 15), name: 'Assumption of Mary', kind: 'catholic' },
    { date: iso(year, 11, 1), name: 'All Saints Day', kind: 'catholic' },
    { date: iso(year, 11, 2), name: 'All Souls Day', kind: 'catholic' },
    { date: iso(year, 12, 8), name: 'Immaculate Conception', kind: 'catholic' },
    { date: iso(year, 12, 25), name: 'Christmas', kind: 'catholic' },
  ];

  return [...federal, ...catholic].sort((a, b) => a.date.localeCompare(b.date));
}
