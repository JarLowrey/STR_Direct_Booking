// Combines a site's Airbnb and VRBO calendars into one, removing bookings that appear on both:
//
//   CALENDAR_FEEDS='[{"label":"Airbnb","url":"..."},{"label":"VRBO","url":"..."}]' node scripts/update-calendar.mjs [site]
//
// Writes sites/<site>/data/combined_calendar.ics, which the site build turns into booked dates. The
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

function eventDate(event, property) {
    return event.match(new RegExp(`^${property}(?:;[^:]*)?:(.+)$`, 'm'))?.[1].trim();
}

// iCal wraps long lines onto continuation lines starting with a space or tab; join them back up.
function unfold(text) {
    return text.replace(/\r?\n[ \t]/g, '');
}

// Keeps only what the site needs from an event: its dates and whether it was cancelled. Feeds also
// carry guest details (Airbnb includes each reservation's code and the last 4 digits of the
// guest's phone number), and this file is committed to a public repository, so everything else is
// dropped. Dropping DTSTAMP (the download time) also means the file only changes when bookings do.
// Returns null for an event without dates.
function bookingOnly(event) {
    const keep = /^(DTSTART|DTEND|STATUS)[;:]/;
    const lines = event.split(/\r?\n/).filter(line => keep.test(line));
    const start = lines.find(line => line.startsWith('DTSTART'));
    const end = lines.find(line => line.startsWith('DTEND'));
    if (!start || !end) {
        return null;
    }

    const status = lines.find(line => line.startsWith('STATUS'));
    return ['BEGIN:VEVENT', start, end, ...(status ? [status] : []), 'END:VEVENT'].join('\r\n');
}

// Merges calendars given as [{ label, text }] into one containing only booking dates. Airbnb and
// VRBO give the same booking different IDs, so a booking is identified by its start and end dates.
export function combineCalendars(calendars) {
    const events = new Map();
    let total = 0;
    let duplicates = 0;

    for (const { label, text } of calendars) {
        if (!text.includes('BEGIN:VCALENDAR')) {
            throw new Error(`${label} did not return an iCal calendar`);
        }

        for (const rawEvent of unfold(text).match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) ?? []) {
            total += 1;
            const event = bookingOnly(rawEvent);
            if (!event) continue;

            const key = `${eventDate(event, 'DTSTART')}|${eventDate(event, 'DTEND')}`;
            if (events.has(key)) {
                duplicates += 1;
            } else {
                events.set(key, event);
            }
        }
    }

    const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Combined Airbnb + VRBO Calendar//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        ...events.values(),
        'END:VCALENDAR'
    ].join('\r\n') + '\r\n';

    return { ics, total, duplicates, events: events.size };
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

    const { ics, total, duplicates, events } = combineCalendars(calendars);
    const outputPath = sitePaths(siteId).calendar;
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, ics, 'utf8');
    console.log(`${siteId}: ${total} events downloaded, ${duplicates} duplicates removed, ${events} written`);
}
