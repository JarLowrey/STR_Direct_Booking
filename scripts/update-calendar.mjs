// Combines a site's Airbnb and VRBO calendars into one, removing bookings that appear on both:
//
//   CALENDAR_FEEDS='[{"label":"Airbnb","url":"..."},{"label":"VRBO","url":"..."}]' node scripts/update-calendar.mjs [site]
//
// Writes sites/<site>/data/combined_calendar.json, which the site build turns into booked dates. The
// feed URLs come from the CALENDAR_FEEDS environment variable (the site's GitHub secret, see
// calendarSecret in site.config.js) because they contain private access tokens.

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { resolveSiteId, sitePaths } from './sites.mjs';

export function parseFeeds(json) {
    let feeds;
    try {
        feeds = JSON.parse(json ?? '');
    } catch {
        throw new Error('CALENDAR_FEEDS must be a JSON array like [{"label":"Airbnb","url":"https://..."}]');
    }
    if (!Array.isArray(feeds) || !feeds.length || !feeds.every(feed => feed?.label && /^https:\/\//.test(feed?.url ?? ''))) {
        throw new Error('CALENDAR_FEEDS must be a non-empty JSON array of { "label", "url" } with https URLs');
    }
    return feeds;
}

// An event's date as YYYY-MM-DD, from a line like "DTSTART;VALUE=DATE:20261010" (or a date-time
// such as 20261010T160000Z, whose time is ignored). Null when the event has no such date.
function eventDate(event, property) {
    const value = event.match(new RegExp(`^${property}(?:;[^:]*)?:(.+)$`, 'm'))?.[1].trim();
    const parts = value?.match(/^(\d{4})(\d{2})(\d{2})/);
    return parts ? `${parts[1]}-${parts[2]}-${parts[3]}` : null;
}

// iCal wraps long lines onto continuation lines starting with a space or tab; join them back up.
function unfold(text) {
    return text.replace(/\r?\n[ \t]/g, '');
}

// Merges calendars given as [{ label, text }] into the bookings the site shows: { checkIn, checkOut }
// as YYYY-MM-DD dates, in order (check-out is the morning after the last booked night). Only the
// dates are kept: feeds also carry guest details (Airbnb includes each reservation's code and the
// last 4 digits of the guest's phone number), and the file is committed to a public repository.
// Leaving out the download time also means the file only changes when bookings do. Cancelled events
// and events without dates are dropped. Airbnb and VRBO give the same booking different IDs, so a
// booking is identified by its dates.
export function combineCalendars(calendars) {
    const bookings = new Map();
    let total = 0;
    let duplicates = 0;

    for (const { label, text } of calendars) {
        if (!text.includes('BEGIN:VCALENDAR')) {
            throw new Error(`${label} did not return an iCal calendar`);
        }

        for (const event of unfold(text).match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) ?? []) {
            total += 1;
            const checkIn = eventDate(event, 'DTSTART');
            const checkOut = eventDate(event, 'DTEND');
            const status = event.match(/^STATUS:(.+)$/m)?.[1].trim();
            if (!checkIn || !checkOut || checkOut <= checkIn || status === 'CANCELLED') continue;

            const key = `${checkIn}|${checkOut}`;
            if (bookings.has(key)) {
                duplicates += 1;
            } else {
                bookings.set(key, { checkIn, checkOut });
            }
        }
    }

    const sorted = [...bookings.values()].sort((left, right) =>
        left.checkIn.localeCompare(right.checkIn) || left.checkOut.localeCompare(right.checkOut));
    const json = `${JSON.stringify({ bookings: sorted }, null, 2)}\n`;

    return { bookings: sorted, json, total, duplicates };
}

async function downloadCalendar({ label, url }, fetchCalendar = fetch) {
    const response = await fetchCalendar(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!response.ok) {
        throw new Error(`${label} calendar returned HTTP ${response.status}`);
    }
    return { label, text: await response.text() };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const siteId = await resolveSiteId(process.argv[2]);
    const feeds = parseFeeds(process.env.CALENDAR_FEEDS);
    const calendars = [];
    for (const feed of feeds) {
        console.log(`Downloading ${feed.label}...`);
        calendars.push(await downloadCalendar(feed));
    }

    const { bookings, json, total, duplicates } = combineCalendars(calendars);
    const outputPath = sitePaths(siteId).calendar;
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, json, 'utf8');
    console.log(`${siteId}: ${total} events downloaded, ${duplicates} duplicates removed, ${bookings.length} bookings written`);
}
