/* Timed geometry uses elapsed Chicago instants, including 23/25-hour DST days. */
(function (root) {
  'use strict';
  const T = typeof module === 'object' && module.exports ? require('./time.js') : root.UpNextTime;
  const clock = new Intl.DateTimeFormat('en-US', { timeZone: T.ZONE, hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
  const isDeadline = i => ['assignment', 'routine'].includes(i.kind);
  function dayModel(date, items) {
    const start = T.zonedDate(date), end = T.zonedDate(T.addDays(date, 1));
    const minutes = (end - start) / 6e4;
    const bars = [], points = [], allDay = [];
    for (const item of items) {
      if (!item.start || item.allDay) {
        const last = item.allDay && item.endDate ? item.endDate : T.addDays(item.date, 1);
        if (date >= item.date && date < last) allDay.push({ item, label: item.allDay ? 'All day' : 'Time not specified' });
        continue;
      }
      const eventStart = T.startOf(item), eventEnd = T.endOf(item);
      if (!eventEnd || isDeadline(item)) {
        if (item.date === date) points.push({ item, minute: (eventStart - start) / 6e4, type: isDeadline(item) ? 'deadline' : 'unknown' });
      } else if (eventStart < end && eventEnd > start) {
        const from = new Date(Math.max(eventStart, start)), to = new Date(Math.min(eventEnd, end));
        bars.push({ item, start: (from - start) / 6e4, end: (to - start) / 6e4,
          continuesBefore: eventStart < start, continuesAfter: eventEnd > end });
      }
    }
    const ticks = [];
    for (let minute = 0; minute < minutes; minute += 60) ticks.push({ minute, label: clock.format(new Date(+start + minute * 6e4)) });
    const pointGroups = new Map();
    for (const p of points) { const group = pointGroups.get(p.minute) || []; group.push(p); pointGroups.set(p.minute, group); }
    for (const group of pointGroups.values()) group.forEach((p, lane) => { p.lane = lane; p.lanes = group.length; });
    return { date, start, end, minutes, ticks, bars: layoutIntervals(bars), points, allDay };
  }
  function layoutIntervals(intervals) {
    const sorted = intervals.map(i => ({ ...i })).sort((a, b) => a.start - b.start || b.end - a.end);
    let group = [], groupEnd = -Infinity;
    const finish = () => {
      const laneEnds = [];
      for (const i of group) {
        let lane = laneEnds.findIndex(end => end <= i.start);
        if (lane < 0) lane = laneEnds.length;
        i.lane = lane; laneEnds[lane] = i.end;
      }
      group.forEach(i => i.lanes = laneEnds.length);
    };
    for (const i of sorted) {
      if (i.end <= i.start) throw new RangeError('Duration bars require a positive recorded interval');
      if (i.start >= groupEnd) { finish(); group = []; groupEnd = -Infinity; }
      group.push(i); groupEnd = Math.max(groupEnd, i.end);
    }
    finish(); return sorted;
  }
  function weekModel(firstDate, items) {
    const days = Array.from({ length: 7 }, (_, n) => dayModel(T.addDays(firstDate, n), items));
    return { days, minutes: Math.max(...days.map(d => d.minutes)) };
  }
  const api = { dayModel, weekModel, layoutIntervals };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.UpNextCalendar = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
