// Build-time access to the current site's data, which the workflows keep up to date. Only used by
// server code (pages, sitemap), so these files are read once per build and compiled into the site
// rather than fetched by the browser.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { unavailableDatesFromCalendar } from './availability.js';
import { SITE_ID } from './current-site.js';

const siteDir = join(process.cwd(), 'sites', SITE_ID);

function readJson(path) {
    return JSON.parse(readFileSync(path, 'utf8'));
}

// Booked dates (YYYY-MM-DD) from the combined Airbnb/VRBO calendar. The calendar workflow
// redeploys the site whenever the calendar changes, so these stay current.
export function loadUnavailableDates() {
    return unavailableDatesFromCalendar(readFileSync(join(siteDir, 'data', 'combined_calendar.ics'), 'utf8'));
}

// { rating, count, listingUrl, fetchedAt, reviews: [{ id, rating, date, text }] }, where rating and
// count cover all Airbnb reviews and reviews holds the five-star ones shown on the page.
export function loadReviewData() {
    const data = readJson(join(siteDir, 'data', 'reviews.json'));
    return { ...data, reviews: Array.isArray(data.reviews) ? data.reviews : [] };
}

// { fetchedAt, photos: [{ order, file, thumbnails, room, description, ... }] } in Airbnb's order.
export function loadPhotoData() {
    const data = readJson(join(siteDir, 'public', 'images', 'airbnb_images', 'metadata.json'));
    const photos = Array.isArray(data.photos) ? [...data.photos] : [];
    photos.sort((left, right) => left.order - right.order);
    return { ...data, photos };
}
