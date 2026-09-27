export function parseIcalDate(value) {
    const dateValue = value.split(':').pop().trim();
    const dateParts = dateValue.match(/^(\d{4})(\d{2})(\d{2})/);

    if (!dateParts) {
        return null;
    }

    return new Date(Date.UTC(
        Number(dateParts[1]),
        Number(dateParts[2]) - 1,
        Number(dateParts[3])
    ));
}

export function dateKey(date) {
    return date.toISOString().slice(0, 10);
}

export function parseUnavailableDates(icalText) {
    const lines = icalText.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
    const unavailableDates = new Set();
    let event = null;

    lines.forEach(line => {
        if (line === 'BEGIN:VEVENT') {
            event = {};
        } else if (line === 'END:VEVENT' && event) {
            if (event.start && event.end && event.status !== 'CANCELLED') {
                for (const date = new Date(event.start); date < event.end; date.setUTCDate(date.getUTCDate() + 1)) {
                    unavailableDates.add(dateKey(date));
                }
            }
            event = null;
        } else if (event && line.startsWith('DTSTART')) {
            event.start = parseIcalDate(line);
        } else if (event && line.startsWith('DTEND')) {
            event.end = parseIcalDate(line);
        } else if (event && line.startsWith('STATUS:')) {
            event.status = line.slice(7).trim();
        }
    });

    return unavailableDates;
}

// Booked dates (YYYY-MM-DD, sorted) from the combined Airbnb/VRBO calendar. Throws on anything that
// isn't an iCal calendar, so a bad calendar file fails the build instead of publishing an empty one.
export function unavailableDatesFromCalendar(icalText) {
    if (typeof icalText !== 'string' || !icalText.includes('BEGIN:VCALENDAR')) {
        throw new Error('Invalid combined calendar');
    }

    return [...parseUnavailableDates(icalText)].sort();
}
