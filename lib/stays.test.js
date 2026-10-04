import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, canCheckIn, checkOutRange, formatPrice, minNightsFor, optionalFees, stayPrice } from './stays.js';

// A minNights config with the same minimum stay every day.
const everyDay = nights => ({
    weekdays: { sunday: nights, monday: nights, tuesday: nights, wednesday: nights, thursday: nights, friday: nights, saturday: nights }
});

// Booked nights of Oct 10-11 and Oct 15; the calendar ends Oct 20.
const rules = {
    booked: new Set(['2026-10-10', '2026-10-11', '2026-10-15']),
    minNights: everyDay(2),
    lastDate: '2026-10-20'
};

// Two nights, except three for Thursday check-ins (Oct 8 and Oct 15, 2026 are Thursdays) and four on Oct 16.
const thursdays = {
    weekdays: { ...everyDay(2).weekdays, thursday: 3 },
    specialDates: [{ date: '2026-10-16', minNights: 4 }]
};

test('formats prices in whole dollars unless they have cents', () => {
    assert.equal(formatPrice(800, 'USD'), '$800');
    assert.equal(formatPrice(3251, 'USD'), '$3,251');
    assert.equal(formatPrice(12.5, 'USD'), '$12.50');
});

test('adds days across month and year ends', () => {
    assert.equal(addDays('2026-10-31', 1), '2026-11-01');
    assert.equal(addDays('2026-12-31', 1), '2027-01-01');
    assert.equal(addDays('2026-11-01', -1), '2026-10-31');
});

test('allows check-in only when the minimum stay fits before the next booking', () => {
    assert.equal(canCheckIn('2026-10-08', rules), true);
    // One open night before the Oct 10 booking.
    assert.equal(canCheckIn('2026-10-09', rules), false);
    assert.equal(canCheckIn('2026-10-10', rules), false);
    assert.equal(canCheckIn('2026-10-12', rules), true);
    assert.equal(canCheckIn('2026-10-14', rules), false);
});

test('allows check-in only when the minimum stay ends by the last calendar day', () => {
    assert.equal(canCheckIn('2026-10-18', rules), true);
    assert.equal(canCheckIn('2026-10-19', rules), false);
});

test('allows check-out from the minimum stay through the next booked night', () => {
    assert.deepEqual(checkOutRange('2026-10-07', rules), ['2026-10-09', '2026-10-10']);
    assert.deepEqual(checkOutRange('2026-10-12', rules), ['2026-10-14', '2026-10-15']);
});

test('allows check-out through the last calendar day when nothing is booked after check-in', () => {
    assert.deepEqual(checkOutRange('2026-10-16', rules), ['2026-10-18', '2026-10-20']);
    assert.deepEqual(checkOutRange('2026-10-16', { ...rules, minNights: everyDay(3) }), ['2026-10-19', '2026-10-20']);
});

test('takes the minimum stay from the check-in weekday unless the date has its own', () => {
    assert.equal(minNightsFor('2026-10-07', thursdays), 2);
    assert.equal(minNightsFor('2026-10-08', thursdays), 3);
    assert.equal(minNightsFor('2026-10-15', thursdays), 3);
    assert.equal(minNightsFor('2026-10-16', thursdays), 4);
    assert.equal(minNightsFor('2026-10-17', thursdays), 2);
});

test('applies the minimum stay for the check-in day when picking dates', () => {
    const booked = new Set(['2026-10-11']);
    const days = { booked, minNights: thursdays, lastDate: '2026-10-31' };
    // Wednesday: two nights fit before the Oct 11 booking.
    assert.equal(canCheckIn('2026-10-07', days), true);
    // Thursday: three nights (Oct 8-10) fit; Friday's two (Oct 9-10) do too.
    assert.equal(canCheckIn('2026-10-08', days), true);
    assert.equal(canCheckIn('2026-10-09', days), true);
    assert.deepEqual(checkOutRange('2026-10-08', days), ['2026-10-11', '2026-10-11']);
    // Oct 16's four nights must end by the last calendar day.
    assert.deepEqual(checkOutRange('2026-10-16', days), ['2026-10-20', '2026-10-31']);
    assert.equal(canCheckIn('2026-10-16', { ...days, lastDate: '2026-10-19' }), false);
    // Thursday with only two open nights before a booking.
    assert.equal(canCheckIn('2026-10-08', { ...days, booked: new Set(['2026-10-10']) }), false);
});

const fees = {
    cleaningFee: 250,
    petFee: 60,
    petFeeCharged: 'per stay',
    extraGuestFee: 25,
    extraGuestFeeAfterGuests: 4
};

test('prices each night from check-in through the night before check-out, plus cleaning', () => {
    const prices = { '2026-10-12': 400, '2026-10-13': 450, '2026-10-14': 500 };
    assert.deepEqual(stayPrice('2026-10-12', '2026-10-15', prices, fees), {
        nights: [
            { date: '2026-10-12', price: 400 },
            { date: '2026-10-13', price: 450 },
            { date: '2026-10-14', price: 500 }
        ],
        nightlyTotal: 1350,
        cleaningFee: 250,
        total: 1600
    });
});

test('leaves the totals out when a night has no price', () => {
    const { nights, nightlyTotal, total } = stayPrice('2026-10-12', '2026-10-14', { '2026-10-12': 400 }, fees);
    assert.deepEqual(nights, [{ date: '2026-10-12', price: 400 }, { date: '2026-10-13', price: null }]);
    assert.equal(nightlyTotal, null);
    assert.equal(total, null);
});

test('prices a stay without fees from its nights alone', () => {
    const { cleaningFee: cleaning, total } = stayPrice('2026-10-12', '2026-10-13', { '2026-10-12': 400 }, null);
    assert.equal(cleaning, null);
    assert.equal(total, 400);
});

test('lists pet and extra-guest fees as optional', () => {
    assert.deepEqual(optionalFees(fees, 6), [
        { label: 'Pets', amount: 60, unit: 'per stay' },
        { label: 'Each guest after 4', amount: 25, unit: 'per night' }
    ]);
});

test('leaves out an extra-guest fee the listing can never charge', () => {
    assert.deepEqual(optionalFees({ ...fees, extraGuestFeeAfterGuests: 2 }, 2), [
        { label: 'Pets', amount: 60, unit: 'per stay' }
    ]);
    assert.deepEqual(optionalFees(null, 6), []);
});
