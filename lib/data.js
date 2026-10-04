// Build-time access to the current site's data, which the workflows keep up to date. Only used by
// server code (pages, sitemap), so these files are read once per build and compiled into the site
// rather than fetched by the browser.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { bookedNights } from './availability.js';
import { SITE_ID } from './current-site.js';

const siteDir = join(process.cwd(), 'sites', SITE_ID);

function readJson(path) {
    return JSON.parse(readFileSync(path, 'utf8'));
}

// Booked dates (YYYY-MM-DD) from the combined Airbnb/VRBO calendar. The calendar workflow
// redeploys the site whenever the calendar changes, so these stay current. Returns null for a site
// whose calendar hasn't been set up yet (no calendar file), so the page can leave availability out.
export function loadUnavailableDates() {
    const path = join(siteDir, 'data', 'combined_calendar.json');
    if (!existsSync(path)) {
        return null;
    }
    return bookedNights(readJson(path));
}

// { currency, prices: { 'YYYY-MM-DD': nightly price }, fees, refundableDeposit } from the pricing data, used to price
// the stay picked on the availability calendar. fees is Airbnb's { cleaningFee, petFee, petFeeCharged, extraGuestFee,
// extraGuestFeeAfterGuests, ... } (null if missing; see lib/stays.js), and refundableDeposit the damage deposit (null
// if missing), also shown in the booking terms. Returns null for a site without pricing data, so the calendar leaves
// prices out.
export function loadPricing() {
    const path = join(siteDir, 'data', 'pricing.json');
    if (!existsSync(path)) {
        return null;
    }
    const data = readJson(path);
    const days = Array.isArray(data.days) ? data.days : [];
    const prices = Object.fromEntries(days
        .filter(day => typeof day?.date === 'string' && Number.isFinite(day.price))
        .map(day => [day.date, day.price]));
    const fees = data.fees && typeof data.fees === 'object' ? data.fees : null;
    const refundableDeposit = Number.isFinite(data.refundableDeposit) ? data.refundableDeposit : null;
    return { currency: data.currency || 'USD', prices, fees, refundableDeposit };
}

// { rating, count, listingUrl, fetchedAt, reviews: [{ id, rating, date, text }] }: Airbnb's overall
// rating and count, and every review, all shown on the page.
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
