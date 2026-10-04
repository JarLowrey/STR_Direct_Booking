// Rules for picking and pricing a stay on the availability calendar. Dates are YYYY-MM-DD strings, which sort in date order as
// plain strings. Each date stands for the night that starts on it: a stay checks in on its first night and checks
// out the morning after its last, so check-out can fall on another guest's check-in day.

export function addDays(date, days) {
    const next = new Date(`${date}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + days);
    return next.toISOString().slice(0, 10);
}

// The keys of a site's minNights.weekdays, in the order Date.getUTCDay() numbers them.
export const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// The minimum stay, in nights, for a stay checking in on date, from a site's minNights: the date's entry in
// specialDates if it has one, otherwise its weekday's entry in weekdays.
export function minNightsFor(date, minNights) {
    const special = minNights.specialDates?.find(entry => entry.date === date);
    if (special) {
        return special.minNights;
    }
    return minNights.weekdays[WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()]];
}

// Whether a stay can start on date: its first minimum-stay nights (see minNightsFor) are open and it checks out by
// lastDate (the last day the calendar shows).
export function canCheckIn(date, { booked, minNights, lastDate }) {
    const nights = minNightsFor(date, minNights);
    if (addDays(date, nights) > lastDate) {
        return false;
    }
    for (let night = 0; night < nights; night++) {
        if (booked.has(addDays(date, night))) {
            return false;
        }
    }
    return true;
}

// [earliest, latest] check-out for a stay starting on checkIn (one canCheckIn allows): the minimum stay later at the
// earliest, and no later than the first booked night after it or lastDate, whichever comes first.
export function checkOutRange(checkIn, { booked, minNights, lastDate }) {
    let latest = addDays(checkIn, 1);
    while (latest < lastDate && !booked.has(latest)) {
        latest = addDays(latest, 1);
    }
    return [addDays(checkIn, minNightsFor(checkIn, minNights)), latest];
}

// "$800", or "$12.50" for an amount with cents.
export function formatPrice(amount, currency) {
    const digits = Number.isInteger(amount) ? 0 : 2;
    return amount.toLocaleString('en-US', {
        style: 'currency', currency, minimumFractionDigits: digits, maximumFractionDigits: digits
    });
}

// Fees only some stays pay, which the calendar can't price without knowing the guests: [{ label, amount, unit }]
// for pets, and for each guest past the number the nightly rate covers (left out when that's already the most the
// listing sleeps).
export function optionalFees(fees, maxGuests) {
    const optional = [];
    if (Number.isFinite(fees?.petFee) && fees.petFee > 0) {
        optional.push({ label: 'Pets', amount: fees.petFee, unit: fees.petFeeCharged || 'per stay' });
    }
    const includedGuests = fees?.extraGuestFeeAfterGuests;
    if (Number.isFinite(fees?.extraGuestFee) && fees.extraGuestFee > 0 && !(includedGuests >= maxGuests)) {
        optional.push({
            label: Number.isFinite(includedGuests) ? `Each guest after ${includedGuests}` : 'Extra guests',
            amount: fees.extraGuestFee,
            unit: 'per night'
        });
    }
    return optional;
}

// Each night's price, their sum, the cleaning fee (null when the fees don't include one), and the stay's total, from
// nightly prices by date and the listing's fees. A night missing from prices (past the end of the pricing data) has a
// null price, and then the sums are null.
export function stayPrice(checkIn, checkOut, prices, fees) {
    const nights = [];
    for (let date = checkIn; date < checkOut; date = addDays(date, 1)) {
        nights.push({ date, price: Number.isFinite(prices[date]) ? prices[date] : null });
    }
    const nightlyTotal = nights.every(night => night.price !== null)
        ? nights.reduce((sum, night) => sum + night.price, 0)
        : null;
    const cleaning = Number.isFinite(fees?.cleaningFee) ? fees.cleaningFee : null;
    const total = nightlyTotal === null ? null : nightlyTotal + (cleaning ?? 0);
    return { nights, nightlyTotal, cleaningFee: cleaning, total };
}
