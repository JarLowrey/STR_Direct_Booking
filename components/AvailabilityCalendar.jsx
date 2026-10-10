'use client';

import { useEffect, useMemo, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { addDays, canCheckIn, checkOutRange, formatPrice, minNightsFor, optionalFees, stayPrice } from '../lib/stays.js';
import { useUrlParams } from '../lib/url-params.js';
import Modal from './Modal.jsx';

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function calendarDateKey(date) {
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString().slice(0, 10);
}

function startOfToday() {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
}

// The calendar shows a year: today through 364 days from now.
function lastCalendarDate(today) {
    return new Date(today.getFullYear(), today.getMonth(), today.getDate() + 364);
}

function formatDate(key, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
    return new Date(`${key}T00:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', ...options });
}

function pluralNights(count) {
    return `${count} ${count === 1 ? 'night' : 'nights'}`;
}

// The picked stay's total and the refundable deposit (null if none), which is kept out of the total and has its own
// breakdown. An expandable price breakdown (the nights with each night's rate, the cleaning fee, and the fees only some
// stays pay) is commented out below.
function StayPrice({ stay, currency, extraFees, deposit }) {
    const price = amount => formatPrice(amount, currency);
    const nightCount = stay.nights.length;
    const sameRate = stay.nights.every(night => night.price === stay.nights[0].price);
    const rate = `${price(Math.round(stay.nightlyTotal / nightCount))}${sameRate ? '' : ' avg.'}`;

    return (
        <>
            <p className="stay-total">
                {price(stay.total)}
                <span> total before taxes</span>
            </p>
            {deposit !== null && (
                <p className="stay-deposit">{`+ ${price(deposit)} refundable damage deposit`}</p>
            )}
            {/* Price breakdown: hidden for now. To show it again, uncomment the block below; nightCount, rate, and
                extraFees above are only used by it. */}
            {/* <details className="stay-breakdown">
                <summary>Price breakdown</summary>
                <ul className="stay-breakdown-lines">
                    <li>
                        <span>{`${rate} × ${pluralNights(nightCount)}`}</span>
                        <span>{price(stay.nightlyTotal)}</span>
                    </li>
                    {nightCount > 1 && (
                        <li className="stay-nightly">
                            <details>
                                <summary>Nightly rates</summary>
                                <ul>
                                    {stay.nights.map(night => (
                                        <li key={night.date}>
                                            <span>{formatDate(night.date, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                                            <span>{price(night.price)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </details>
                        </li>
                    )}
                    {stay.cleaningFee !== null && (
                        <li>
                            <span>Cleaning fee</span>
                            <span>{price(stay.cleaningFee)}</span>
                        </li>
                    )}
                    <li className="stay-breakdown-total">
                        <span>Total before taxes</span>
                        <span>{price(stay.total)}</span>
                    </li>
                </ul>
                {extraFees.length > 0 && (
                    <>
                        <p className="stay-breakdown-heading">Additional fees may apply</p>
                        <ul className="stay-breakdown-lines">
                            {extraFees.map(fee => (
                                <li key={fee.label}>
                                    <span>{fee.label}</span>
                                    <span>{`${price(fee.amount)} ${fee.unit}`}</span>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </details> */}
            {deposit !== null && (
                <details className="stay-breakdown">
                    <summary>Deposit breakdown</summary>
                    <ul className="stay-breakdown-lines">
                        <li>
                            <span>Total before taxes</span>
                            <span>{price(stay.total)}</span>
                        </li>
                        <li>
                            <span>Refundable damage deposit</span>
                            <span>{price(deposit)}</span>
                        </li>
                        <li className="stay-breakdown-total">
                            <span>Total with deposit</span>
                            <span>{price(stay.total + deposit)}</span>
                        </li>
                    </ul>
                    <p className="stay-breakdown-note">
                        The deposit is refunded after your stay, provided there is no damage to the property.
                    </p>
                </details>
            )}
            <p className="availability-status">Taxes are not included. Additional fees may apply.</p>
        </>
    );
}

// Availability from the combined Airbnb/VRBO calendar, where guests pick check-in and check-out dates to see the
// stay's price, then open the booking options (bookNow, the Book Now section's content) in a pop-up. The booked dates
// and prices are compiled in at build time (see lib/data.js); the calendar itself only renders in the browser because
// it starts from today's date, which the build can't know. The picked dates are kept in the URL
// (?checkin=2026-11-06&checkout=2026-11-09), so a link reopens them.
export default function AvailabilityCalendar({ unavailableDates, minNights, maxGuests, pricing, bookNow }) {
    const [today, setToday] = useState(null);
    const [checkIn, setCheckIn] = useState(null);
    const [checkOut, setCheckOut] = useState(null);
    const [bookingOpen, setBookingOpen] = useState(false);
    // Why the last day clicked couldn't be picked, if it couldn't.
    const [hint, setHint] = useState(null);
    const booked = useMemo(() => new Set(unavailableDates), [unavailableDates]);

    useEffect(() => {
        setToday(startOfToday());
    }, []);

    // Dates from a link are only picked if they could be clicked: a check-in that can start a stay today, and a
    // check-out it can end on.
    useUrlParams(
        params => {
            const urlCheckIn = params.get('checkin');
            const urlCheckOut = params.get('checkout');
            const todayDate = startOfToday();
            const urlRules = { booked, minNights, lastDate: calendarDateKey(lastCalendarDate(todayDate)) };
            if (!DATE_KEY.test(urlCheckIn) || urlCheckIn < calendarDateKey(todayDate) || !canCheckIn(urlCheckIn, urlRules)) {
                return;
            }
            setCheckIn(urlCheckIn);
            const [earliest, latest] = checkOutRange(urlCheckIn, urlRules);
            if (DATE_KEY.test(urlCheckOut) && urlCheckOut >= earliest && urlCheckOut <= latest) {
                setCheckOut(urlCheckOut);
            }
        },
        { checkin: checkIn, checkout: checkOut },
        'availability'
    );

    const maxDate = useMemo(() => today && lastCalendarDate(today), [today]);
    const rules = useMemo(
        () => maxDate && { booked, minNights, lastDate: calendarDateKey(maxDate) },
        [booked, minNights, maxDate]
    );
    // While choosing a check-out date: the dates it can be.
    const checkOutDates = useMemo(
        () => (checkIn && !checkOut ? checkOutRange(checkIn, rules) : null),
        [checkIn, checkOut, rules]
    );

    if (!today) {
        return <p className="availability-status">Loading availability...</p>;
    }

    const isCheckOutDate = key => checkOutDates && key >= checkOutDates[0] && key <= checkOutDates[1];

    // A booked night runs from one day's afternoon to the next morning, so a day is only fully taken when both its own
    // night and the night before are booked. A day with just its own night booked is another guest's check-in day
    // (taken from the afternoon; it can still be a check-out), and one with just the night before booked is their
    // check-out day (free from the afternoon; it can still be a check-in).
    const isFullyBooked = key => booked.has(key) && booked.has(addDays(key, -1));

    // Choosing a check-out date, only the dates it can be are open, plus check-in (to clear it) and earlier dates
    // (to move check-in). Otherwise every day that isn't fully booked is open; one that can't start a stay explains
    // why when clicked.
    const isSelectable = key => {
        if (checkOutDates) {
            return isCheckOutDate(key) || key === checkIn || (key < checkIn && canCheckIn(key, rules));
        }
        return !isFullyBooked(key);
    };

    const whyNotCheckIn = key => {
        if (booked.has(key)) {
            return `${formatDate(key)} is another guest's check-in day, so it can only be your check-out. ` +
                'Pick your check-in date first.';
        }
        const nights = minNightsFor(key, minNights);
        const limit = addDays(key, nights) > rules.lastDate ? 'the end of the calendar' : 'the next booking';
        const start = formatDate(key, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
        return `A stay starting ${start} can't meet its ${nights}-night minimum before ${limit}.`;
    };

    const selectDate = date => {
        const key = calendarDateKey(date);
        setHint(null);
        if (isCheckOutDate(key)) {
            setCheckOut(key);
        } else if (checkOutDates && key === checkIn) {
            setCheckIn(null);
        } else if (canCheckIn(key, rules)) {
            setCheckIn(key);
            setCheckOut(null);
        } else {
            setHint(whyNotCheckIn(key));
        }
    };

    const clearDates = () => {
        setCheckIn(null);
        setCheckOut(null);
        setHint(null);
    };

    const tileClassName = ({ date, view }) => {
        if (view !== 'month') return null;
        const key = calendarDateKey(date);
        const nightBooked = booked.has(key);
        const nightBeforeBooked = booked.has(addDays(key, -1));
        const classes = [
            nightBooked && nightBeforeBooked && 'booked-day',
            nightBooked && !nightBeforeBooked && 'booked-from-afternoon',
            !nightBooked && nightBeforeBooked && 'booked-until-morning',
            key === checkIn && 'stay-check-in',
            key === checkOut && 'stay-check-out',
            checkOut && key > checkIn && key < checkOut && 'stay-night'
        ].filter(Boolean);
        return classes.length ? classes.join(' ') : null;
    };

    const stay = checkIn && checkOut && stayPrice(checkIn, checkOut, pricing?.prices ?? {}, pricing?.fees);
    const stayDates = stay && `${formatDate(checkIn)} to ${formatDate(checkOut)} · ${pluralNights(stay.nights.length)}`;

    return (
        <>
            <Calendar
                // Opens on the check-in's month, for dates picked from a link.
                defaultActiveStartDate={checkIn ? new Date(`${checkIn}T00:00:00`) : undefined}
                minDate={today}
                maxDate={maxDate}
                defaultView="month"
                maxDetail="month"
                minDetail="year"
                // The stay is drawn by tileClassName, so the calendar's own selection is kept empty.
                value={null}
                onClickDay={selectDate}
                tileClassName={tileClassName}
                tileDisabled={({ date, view }) =>
                    view === 'month' && (date < today || !isSelectable(calendarDateKey(date)))}
            />
            <div className="stay-summary" aria-live="polite">
                {hint && <p className="availability-status stay-hint">{hint}</p>}
                {stay ? (
                    <>
                        <p className="stay-dates">{stayDates}</p>
                        {stay.total !== null && (
                            <StayPrice
                                stay={stay}
                                currency={pricing.currency}
                                extraFees={optionalFees(pricing.fees, maxGuests)}
                                deposit={pricing.refundableDeposit ?? null}
                            />
                        )}
                        {stay.total === null && pricing && (
                            <p className="availability-status">Pricing isn&apos;t available for all of these dates yet.</p>
                        )}
                    </>
                ) : checkIn ? (
                    <p className="availability-status">
                        {`Check-in ${formatDate(checkIn)}. Now pick a check-out date (${pluralNights(minNightsFor(checkIn, minNights))} minimum).`}
                    </p>
                ) : (
                    <p className="availability-status">
                        {`Pick check-in and check-out dates${pricing ? ' to see pricing' : ''}`}
                    </p>
                )}
                {checkIn && (
                    <div className="stay-actions">
                        {stay && bookNow && (
                            <button type="button" className="stay-book" onClick={() => setBookingOpen(true)}>
                                Book Now
                            </button>
                        )}
                        <button type="button" className="stay-clear" onClick={clearDates}>Clear dates</button>
                    </div>
                )}
            </div>
            {bookNow && (
                <Modal open={bookingOpen} onClose={() => setBookingOpen(false)} title="Book Now">
                    {stay && (
                        <p className="modal-stay">
                            {stayDates}
                            {stay.total !== null && ` · ${formatPrice(stay.total, pricing.currency)} before taxes`}
                            {stay.total !== null && pricing.refundableDeposit != null &&
                                ` + ${formatPrice(pricing.refundableDeposit, pricing.currency)} refundable deposit`}
                        </p>
                    )}
                    {bookNow}
                </Modal>
            )}
        </>
    );
}
