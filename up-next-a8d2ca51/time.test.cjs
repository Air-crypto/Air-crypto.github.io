const { test } = require('node:test');
const assert = require('node:assert/strict');
const T = require('./time.js');
const item = overrides => ({ id: 'fixture', title: 'Fixture event', date: '2026-10-19', start: '11:30', end: '11:50', kind: 'interview', ...overrides });
const instant = iso => new Date(iso);

test('ongoing event stays eligible through, but not at, its actual end', () => {
  const i = item();
  for (const at of ['2026-10-19T16:29:00Z', '2026-10-19T16:30:00Z', '2026-10-19T16:49:59Z']) assert.equal(T.eligible(i, instant(at)), true);
  assert.equal(T.eligible(i, instant('2026-10-19T16:50:00Z')), false);
  assert.match(T.status(i, instant('2026-10-19T16:40:00Z')), /^In progress/);
});
test('unknown ends remain eligible through the Chicago day and never claim to be ongoing', () => {
  const i = item({ end: null });
  assert.equal(T.endOf(i), null);
  assert.equal(T.eligible(i, instant('2026-10-20T04:59:59Z')), true);
  assert.equal(T.eligible(i, instant('2026-10-20T05:00:00Z')), false);
  assert.match(T.status(i, instant('2026-10-19T18:00:00Z')), /end unknown/);
  const ics = T.calendarText(i);
  assert.doesNotMatch(ics, /DTEND|DURATION/);
  assert.match(ics, /End time unknown/);
});
test('Chicago DST changes produce absolute UTC instants independent of device zone', () => {
  assert.equal(T.zonedDate('2026-07-01', '11:30').toISOString(), '2026-07-01T16:30:00.000Z');
  assert.equal(T.zonedDate('2026-12-01', '11:30').toISOString(), '2026-12-01T17:30:00.000Z');
  assert.equal(T.zoneLabel(item()), 'CDT');
  assert.equal(T.zoneLabel(item({ date: '2026-12-01' })), 'CST');
  assert.equal(T.dateKey(instant('2026-11-02T05:30:00Z')), '2026-11-01');
});
test('spring gaps reject nonexistent times and fall folds choose the earlier occurrence', () => {
  assert.throws(() => T.zonedDate('2026-03-08', '02:30'), /does not exist/);
  assert.equal(T.zonedDate('2026-11-01', '01:30').toISOString(), '2026-11-01T06:30:00.000Z');
  const i = item({ date: '2026-11-01', start: '00:30', end: '02:30' });
  assert.equal(T.endOf(i) - T.startOf(i), 3 * 36e5);
  const spring = item({ date: '2026-03-08', start: '01:30', end: '03:30' });
  assert.equal(T.endOf(spring) - T.startOf(spring), 36e5);
});
test('overnight intervals and explicit end dates keep their true date', () => {
  const i = item({ start: '23:30', end: '00:30' });
  assert.equal(T.endOf(i).toISOString(), '2026-10-20T05:30:00.000Z');
  assert.equal(T.eligible(i, instant('2026-10-20T05:15:00Z')), true);
  assert.match(T.calendarText(i), /DTEND:20261020T053000Z/);
  assert.equal(T.endOf(item({ endDate: '2026-10-21' })).toISOString(), '2026-10-21T16:50:00.000Z');
});
test('missing start is honestly described as a date-only placeholder', () => {
  const i = item({ start: null, end: null });
  assert.equal(T.timeStr(i), 'Time not specified');
  assert.match(T.calendarText(i), /DTSTART;VALUE=DATE:20261019/);
  assert.match(T.calendarText(i), /DTEND;VALUE=DATE:20261020/);
  assert.match(T.calendarText(i).replace(/\r\n /g, ''), /date-only calendar placeholder/);
  assert.equal(T.timeStr(item({ start: null, end: null, allDay: true })), 'All day');
});
test('ICS is escaped, folded at 75 UTF-8 bytes, CRLF terminated, and stamped', () => {
  const text = T.calendarText(item({ title: 'A, B; C\\D\nNew', note: 'Résumé '.repeat(40) }), instant('2026-01-01T00:00:00Z'));
  assert.match(text, /SUMMARY:A\\, B\\; C\\\\D\\nNew/);
  assert.match(text, /DTSTAMP:20260101T000000Z/);
  assert.match(text, /X-WR-TIMEZONE:America\/Chicago/);
  for (const line of text.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75);
  assert.ok(text.endsWith('\r\n'));
});
test('existing AfterQuery data exports the verified 11:30–11:50 CDT interval', () => {
  const data = require('./data.json');
  const i = data.items.find(i => i.date === '2026-10-19' && i.title === 'Interview: AfterQuery');
  assert.equal(i.start, '11:30'); assert.equal(i.end, '11:50');
  assert.match(T.calendarText({ ...i, id: 'afterquery' }), /DTSTART:20261019T163000Z\r\nDTEND:20261019T165000Z/);
  for (const i of data.items) { T.startOf(i); T.endOf(i); }
});

test('ranges across a DST transition label both endpoint zones', () => {
  assert.equal(T.timeStr(item({date:'2026-11-01',start:'00:30',end:'02:30'})), '12:30am CDT–2:30am CST');
  assert.equal(T.timeStr(item({date:'2026-03-08',start:'01:30',end:'03:30'})), '1:30am CST–3:30am CDT');
});
