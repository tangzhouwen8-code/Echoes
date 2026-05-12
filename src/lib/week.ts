/** Monday 00:00:00.000 in local timezone */
export function startOfWeekMonday(date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfWeekSunday(date = new Date()): Date {
  const start = startOfWeekMonday(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  end.setMilliseconds(-1);
  return end;
}

export function isInCurrentWeek(iso: string, now = new Date()): boolean {
  const t = new Date(iso).getTime();
  return (
    t >= startOfWeekMonday(now).getTime() &&
    t <= endOfWeekSunday(now).getTime()
  );
}
