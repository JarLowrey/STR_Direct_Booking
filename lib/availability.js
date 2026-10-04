import { addDays } from './stays.js';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

// Booked nights (YYYY-MM-DD, sorted) from the combined Airbnb/VRBO calendar, { bookings: [{ checkIn, checkOut }] }
// as written by scripts/update-calendar.mjs: every date from a booking's check-in through the day before its
// check-out, which stays open for the next guest to check in. Throws on anything else, so a bad calendar file fails
// the build instead of publishing an empty one.
export function bookedNights(calendar) {
    const bookings = calendar?.bookings;
    if (!Array.isArray(bookings) || !bookings.every(booking => DATE.test(booking?.checkIn) && DATE.test(booking?.checkOut))) {
        throw new Error('Invalid combined calendar');
    }

    const nights = new Set();
    for (const { checkIn, checkOut } of bookings) {
        for (let date = checkIn; date < checkOut; date = addDays(date, 1)) {
            nights.add(date);
        }
    }
    return [...nights].sort();
}
