'use client';

import { useEffect, useMemo, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

function calendarDateKey(date) {
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString().slice(0, 10);
}

function startOfToday() {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
}

// Availability from the combined Airbnb/VRBO calendar. The booked dates are compiled in at build
// time (see lib/data.js); the calendar itself only renders in the browser because it starts from
// today's date, which the build can't know.
export default function AvailabilityCalendar({ unavailableDates }) {
    const [today, setToday] = useState(null);
    const booked = useMemo(() => new Set(unavailableDates), [unavailableDates]);

    useEffect(() => {
        setToday(startOfToday());
    }, []);

    if (!today) {
        return <p className="availability-status">Loading availability...</p>;
    }

    return (
        <>
            <Calendar
                minDate={today}
                maxDate={new Date(today.getFullYear(), today.getMonth() + 18, today.getDate())}
                showNeighboringMonth={false}
                defaultView="month"
                maxDetail="month"
                minDetail="year"
                tileClassName={({ date, view }) =>
                    view === 'month' && booked.has(calendarDateKey(date)) ? 'unavailable-date' : null}
                tileDisabled={({ date, view }) =>
                    view === 'month' && (date < today || booked.has(calendarDateKey(date)))}
            />
            <p className="availability-status">Unavailable dates are greyed out.</p>
        </>
    );
}
