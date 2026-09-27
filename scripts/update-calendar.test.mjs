import test from 'node:test';
import assert from 'node:assert/strict';
import { combineCalendars, parseFeeds } from './update-calendar.mjs';

const calendar = events => ['BEGIN:VCALENDAR', 'VERSION:2.0', ...events, 'END:VCALENDAR'].join('\r\n');
const event = (uid, start, end) =>
    ['BEGIN:VEVENT', `UID:${uid}`, `DTSTART;VALUE=DATE:${start}`, `DTEND;VALUE=DATE:${end}`, 'END:VEVENT'].join('\r\n');

test('combines calendars and removes bookings listed on both platforms', () => {
    const result = combineCalendars([
        { label: 'Airbnb', text: calendar([event('a1', '20261010', '20261013'), event('a2', '20261101', '20261103')]) },
        { label: 'VRBO', text: calendar([event('v1', '20261010', '20261013'), event('v2', '20261201', '20261205')]) }
    ]);

    assert.equal(result.total, 4);
    assert.equal(result.duplicates, 1);
    assert.equal(result.events, 3);
    assert.match(result.ics, /^BEGIN:VCALENDAR\r\n/);
    assert.match(result.ics, /END:VCALENDAR\r\n$/);
    assert.equal((result.ics.match(/DTSTART;VALUE=DATE:20261010/g) || []).length, 1);
    assert.match(result.ics, /DTSTART;VALUE=DATE:20261101/);
    assert.match(result.ics, /DTSTART;VALUE=DATE:20261201/);
});

test('keeps only booking dates and status, never guest details', () => {
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

    const { ics } = combineCalendars([{ label: 'Airbnb', text: calendar([airbnbEvent]) }]);

    assert.doesNotMatch(ics, /HMABC12345|1234|Reservation|Phone|UID|SUMMARY|DESCRIPTION/);
    assert.match(ics, /BEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20261010\r\nDTEND;VALUE=DATE:20261013\r\nSTATUS:CONFIRMED\r\nEND:VEVENT/);
});

test('skips events without dates', () => {
    const undated = ['BEGIN:VEVENT', 'SUMMARY:Note', 'END:VEVENT'].join('\r\n');
    const { ics, events } = combineCalendars([{ label: 'Airbnb', text: calendar([undated]) }]);

    assert.equal(events, 0);
    assert.doesNotMatch(ics, /VEVENT/);
});

test('produces the same file when only the download time changes', () => {
    const withStamp = stamp => calendar([
        ['BEGIN:VEVENT', `DTSTAMP:${stamp}`, 'UID:a1', 'DTSTART;VALUE=DATE:20261010', 'DTEND;VALUE=DATE:20261013', 'END:VEVENT'].join('\r\n')
    ]);

    const first = combineCalendars([{ label: 'Airbnb', text: withStamp('20260926T120000Z') }]);
    const second = combineCalendars([{ label: 'Airbnb', text: withStamp('20260926T140000Z') }]);

    assert.equal(first.ics, second.ics);
    assert.doesNotMatch(first.ics, /DTSTAMP/);
    assert.match(first.ics, /DTSTART;VALUE=DATE:20261010/);
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
