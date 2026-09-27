import test from 'node:test';
import assert from 'node:assert/strict';
import {
    dateKey,
    parseIcalDate,
    parseUnavailableDates,
    unavailableDatesFromCalendar
} from './availability.js';

const sampleIcal = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART;VALUE=DATE:20261010
DTEND;VALUE=DATE:20261013
STATUS:CONFIRMED
END:VEVENT
BEGIN:VEVENT
DTSTART;VALUE=DATE:20261020
DTEND;VALUE=DATE:20261022
STATUS:CANCELLED
END:VEVENT
END:VCALENDAR`;

test('parses an iCal date as a UTC date', () => {
    assert.equal(dateKey(parseIcalDate('DTSTART;VALUE=DATE:20261010')), '2026-10-10');
});

test('returns null for an invalid iCal date', () => {
    assert.equal(parseIcalDate('DTSTART;VALUE=DATE:not-a-date'), null);
});

test('expands reserved events through the day before DTEND', () => {
    assert.deepEqual(
        [...parseUnavailableDates(sampleIcal)],
        ['2026-10-10', '2026-10-11', '2026-10-12']
    );
});

test('ignores cancelled events', () => {
    const unavailableDates = parseUnavailableDates(sampleIcal);

    assert.equal(unavailableDates.has('2026-10-20'), false);
    assert.equal(unavailableDates.has('2026-10-21'), false);
});

test('unfolds continued iCal lines before parsing events', () => {
    const ical = 'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20261101\r\nDTEND;VALUE=DATE:2026110\r\n 2\r\nEND:VEVENT\r\nEND:VCALENDAR';

    assert.deepEqual([...parseUnavailableDates(ical)], ['2026-11-01']);
});

test('lists booked dates from the combined calendar in order', () => {
    assert.deepEqual(unavailableDatesFromCalendar(sampleIcal), ['2026-10-10', '2026-10-11', '2026-10-12']);
});

test('rejects a file that is not an iCal calendar', () => {
    assert.throws(() => unavailableDatesFromCalendar('<html>not a calendar</html>'), /Invalid combined calendar/);
    assert.throws(() => unavailableDatesFromCalendar(undefined), /Invalid combined calendar/);
});
