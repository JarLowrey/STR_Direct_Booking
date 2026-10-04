import test from 'node:test';
import assert from 'node:assert/strict';
import { combineCalendars, parseFeeds } from './update-calendar.mjs';

const calendar = events => ['BEGIN:VCALENDAR', 'VERSION:2.0', ...events, 'END:VCALENDAR'].join('\r\n');
const event = (uid, start, end) =>
    ['BEGIN:VEVENT', `UID:${uid}`, `DTSTART;VALUE=DATE:${start}`, `DTEND;VALUE=DATE:${end}`, 'END:VEVENT'].join('\r\n');

test('combines calendars and removes bookings listed on both platforms', () => {
    const result = combineCalendars([
        { label: 'Airbnb', text: calendar([event('a1', '20261101', '20261103'), event('a2', '20261010', '20261013')]) },
        { label: 'VRBO', text: calendar([event('v1', '20261010', '20261013'), event('v2', '20261201', '20261205')]) }
    ]);

    assert.equal(result.total, 4);
    assert.equal(result.duplicates, 1);
    assert.deepEqual(result.bookings, [
        { checkIn: '2026-10-10', checkOut: '2026-10-13' },
        { checkIn: '2026-11-01', checkOut: '2026-11-03' },
        { checkIn: '2026-12-01', checkOut: '2026-12-05' }
    ]);
    assert.deepEqual(JSON.parse(result.json), { bookings: result.bookings });
    assert.match(result.json, /\n$/);
});

test('keeps only booking dates, never guest details', () => {
    // Shaped like a real Airbnb event, including a DESCRIPTION folded onto a continuation line.
    const airbnbEvent = [
        'BEGIN:VEVENT',
        'DTEND;VALUE=DATE:20261013',
        'DTSTART;VALUE=DATE:20261010',
        'UID:abc123@airbnb.com',
        'DESCRIPTION:Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMABC12345\\nPhone',
        ' Number (Last 4 Digits): 1234',
        'SUMMARY:Reserved',
        'STATUS:CONFIRMED',
        'END:VEVENT'
    ].join('\r\n');

    const { json } = combineCalendars([{ label: 'Airbnb', text: calendar([airbnbEvent]) }]);

    assert.doesNotMatch(json, /HMABC12345|1234|Reservation|Phone|abc123|Reserved/);
    assert.deepEqual(JSON.parse(json), { bookings: [{ checkIn: '2026-10-10', checkOut: '2026-10-13' }] });
});

test('unfolds continued iCal lines before reading dates', () => {
    const folded = ['BEGIN:VEVENT', 'DTSTART;VALUE=DATE:20261101', 'DTEND;VALUE=DATE:2026110', ' 2', 'END:VEVENT'].join('\r\n');
    const { bookings } = combineCalendars([{ label: 'Airbnb', text: calendar([folded]) }]);

    assert.deepEqual(bookings, [{ checkIn: '2026-11-01', checkOut: '2026-11-02' }]);
});

test('skips cancelled events and events without dates', () => {
    const undated = ['BEGIN:VEVENT', 'SUMMARY:Note', 'END:VEVENT'].join('\r\n');
    const cancelled = [
        'BEGIN:VEVENT', 'DTSTART;VALUE=DATE:20261020', 'DTEND;VALUE=DATE:20261022', 'STATUS:CANCELLED', 'END:VEVENT'
    ].join('\r\n');
    const { bookings } = combineCalendars([{ label: 'Airbnb', text: calendar([undated, cancelled]) }]);

    assert.deepEqual(bookings, []);
});

test('produces the same file when only the download time changes', () => {
    const withStamp = stamp => calendar([
        ['BEGIN:VEVENT', `DTSTAMP:${stamp}`, 'UID:a1', 'DTSTART;VALUE=DATE:20261010', 'DTEND;VALUE=DATE:20261013', 'END:VEVENT'].join('\r\n')
    ]);

    const first = combineCalendars([{ label: 'Airbnb', text: withStamp('20260926T120000Z') }]);
    const second = combineCalendars([{ label: 'Airbnb', text: withStamp('20260926T140000Z') }]);

    assert.equal(first.json, second.json);
    assert.doesNotMatch(first.json, /2026092/);
});

test('refuses to write a calendar when a feed returns something else', () => {
    assert.throws(
        () => combineCalendars([{ label: 'VRBO', text: '<html>Access denied</html>' }]),
        /VRBO did not return an iCal calendar/
    );
});

test('reads feed URLs from the secret JSON', () => {
    assert.deepEqual(parseFeeds('[{"label":"Airbnb","url":"https://www.airbnb.com/calendar/ical/1.ics?t=x"}]'), [
        { label: 'Airbnb', url: 'https://www.airbnb.com/calendar/ical/1.ics?t=x' }
    ]);
    assert.throws(() => parseFeeds(undefined), /must be a JSON array/);
    assert.throws(() => parseFeeds('[]'), /non-empty JSON array/);
    assert.throws(() => parseFeeds('[{"label":"Airbnb","url":"http://insecure"}]'), /https URLs/);
});
