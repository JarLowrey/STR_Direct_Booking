import test from 'node:test';
import assert from 'node:assert/strict';
import { bookedNights } from './availability.js';

test('books every night from check-in through the night before check-out', () => {
    const calendar = { bookings: [{ checkIn: '2026-10-10', checkOut: '2026-10-13' }] };
    assert.deepEqual(bookedNights(calendar), ['2026-10-10', '2026-10-11', '2026-10-12']);
});

test('lists back-to-back and out-of-order bookings once each, in order', () => {
    const calendar = {
        bookings: [
            { checkIn: '2026-10-31', checkOut: '2026-11-02' },
            { checkIn: '2026-10-29', checkOut: '2026-10-31' }
        ]
    };
    assert.deepEqual(bookedNights(calendar), ['2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01']);
});

test('rejects a file that is not a combined calendar', () => {
    assert.throws(() => bookedNights(undefined), /Invalid combined calendar/);
    assert.throws(() => bookedNights({}), /Invalid combined calendar/);
    assert.throws(() => bookedNights({ bookings: [{ checkIn: '20261010', checkOut: '2026-10-13' }] }), /Invalid combined calendar/);
});
