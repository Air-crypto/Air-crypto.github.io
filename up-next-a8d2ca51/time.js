/* All date/start/end fields are America/Chicago wall times, regardless of device zone. */
(function (root) {
  'use strict';
  const ZONE = 'America/Chicago';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const wall = instant => Object.fromEntries(parts.formatToParts(instant).map(p => [p.type, p.value]));
  const dateKey = instant => { const p = wall(instant); return `${p.year}-${p.month}-${p.day}`; };
  const addDays = (date, amount) => {
    const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + amount);
    return d.toISOString().slice(0, 10);
  };
  function zonedDate(date, time = '00:00') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new RangeError('Invalid date or time');
    const base = Date.parse(`${date}T${time}:00Z`);
    // Chicago uses UTC-6 (CST) / UTC-5 (CDT). Verify candidates against IANA rules.
    // A repeated fall-back time selects the earlier occurrence; spring gaps are rejected.
    for (const offset of [5, 6]) {
      const d = new Date(base + offset * 36e5), p = wall(d);
      if (dateKey(d) === date && `${p.hour}:${p.minute}` === time) return d;
    }
    throw new RangeError('Time does not exist in America/Chicago');
  }
  const startOf = i => zonedDate(i.date, i.start || '00:00');
  function endOf(i) {
    if (!i.start || !i.end) return null;
    const endDate = i.endDate || (i.end < i.start ? addDays(i.date, 1) : i.date);
    const end = zonedDate(endDate, i.end);
    if (end <= startOf(i)) throw new RangeError('End must follow start');
    return end;
  }
  function eligible(i, now = new Date()) {
    const end = endOf(i);
    // Missing durations remain visible through their date, with no claim they are ongoing.
    return end ? end > now : i.date >= dateKey(now);
  }
  const fmtTime = t => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, '0')}${h >= 12 ? 'pm' : 'am'}`;
  };
  const zoneAt = instant => new Intl.DateTimeFormat('en-US', { timeZone: ZONE, timeZoneName: 'short' })
    .formatToParts(instant).find(p => p.type === 'timeZoneName').value;
  const zoneLabel = i => zoneAt(startOf(i));
  function timeStr(i) {
    if (!i.start) return i.allDay ? 'All day' : 'Time not specified';
    if (!i.end) return `${fmtTime(i.start)} ${zoneLabel(i)} · ${['assignment', 'routine'].includes(i.kind) ? 'due' : 'end unknown'}`;
    const startZone = zoneLabel(i), endZone = zoneAt(endOf(i));
    const suffix = i.endDate && i.endDate !== i.date ? ' (' + i.endDate + ')' : i.end < i.start ? ' (next day)' : '';
    return startZone === endZone ? `${fmtTime(i.start)}–${fmtTime(i.end)}${suffix} ${startZone}`
      : `${fmtTime(i.start)} ${startZone}–${fmtTime(i.end)} ${endZone}${suffix}`;
  }
  function status(i, now = new Date()) {
    if (!i.start) return i.allDay ? (i.date === dateKey(now) ? 'All day today' : 'All-day event') : 'Time not specified';
    const start = startOf(i), end = endOf(i);
    if (now < start) return `${["assignment", "routine"].includes(i.kind) ? "Due" : "Starts"} ${relative(start, now)}`;
    if (end) return now < end ? `In progress · ends ${relative(end, now)}` : `Ended ${relative(end, now)}`;
    return ['assignment', 'routine'].includes(i.kind) ? `Due ${relative(start, now)}` : `Started ${relative(start, now)} · end unknown`;
  }
  function relative(d, now = new Date()) {
    let ms = d - now; const past = ms < 0; ms = Math.abs(ms);
    const days = Math.floor(ms / 864e5), hours = Math.floor(ms / 36e5) % 24, minutes = Math.floor(ms / 6e4) % 60;
    const text = days ? `${days}d ${hours}h` : hours ? `${hours}h ${minutes}m` : `${minutes}m`;
    return past ? `${text} ago` : `in ${text}`;
  }
  const escapeText = text => String(text ?? '').replace(/\\/g, '\\\\').replace(/\r?\n|\r/g, '\\n').replace(/[,;]/g, c => '\\' + c);
  function fold(line) {
    let result = '', size = 0;
    for (const char of line) {
      const bytes = new TextEncoder().encode(char).length;
      if (size + bytes > 75) { result += '\r\n '; size = 1; }
      result += char; size += bytes;
    }
    return result;
  }
  const utc = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  function calendarText(i, now = new Date()) {
    const end = endOf(i);
    const timing = i.start
      ? [`DTSTART:${utc(startOf(i))}`, ...(end ? [`DTEND:${utc(end)}`] : [])]
      : [`DTSTART;VALUE=DATE:${i.date.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${addDays(i.date, 1).replace(/-/g, '')}`];
    const uncertainty = !i.start ? (i.allDay ? '' : 'Time not specified; date-only calendar placeholder.')
      : !end ? (['assignment', 'routine'].includes(i.kind) ? 'Due time; no duration specified.' : 'End time unknown; no duration specified.') : '';
    const description = [`Times: ${ZONE} (CST/CDT).`, uncertainty, i.course, i.note, i.url, i.desc].filter(Boolean).join('\n');
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Up Next//Schedule//EN', 'CALSCALE:GREGORIAN', `X-WR-TIMEZONE:${ZONE}`,
      'BEGIN:VEVENT', `UID:${escapeText(i.id)}@upnext`, `DTSTAMP:${utc(now)}`, ...timing,
      `SUMMARY:${escapeText((i.course ? i.course + ': ' : '') + i.title)}`, `DESCRIPTION:${escapeText(description)}`,
      'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY', 'DESCRIPTION:Reminder', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR']
      .map(fold).join('\r\n') + '\r\n';
  }
  const api = { ZONE, dateKey, addDays, zonedDate, startOf, endOf, eligible, fmtTime, zoneLabel, timeStr, status, relative, calendarText };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.UpNextTime = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
