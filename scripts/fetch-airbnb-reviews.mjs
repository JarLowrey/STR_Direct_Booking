// Collects a site's Airbnb reviews:
//
//   node scripts/fetch-airbnb-reviews.mjs [site]
//
// Writes sites/<site>/data/reviews.json with Airbnb's overall rating and review count (across all
// reviews) and the text of the five-star reviews, which are the ones shown on the site.

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadSiteConfig, resolveSiteId, sitePaths } from './sites.mjs';

export function reviewsUrl(listingId) {
    return 'https://www.airbnb.com/rooms/' + listingId + '?modal=REVIEWS';
}

const reviewTextKeys = ['comments', 'comment', 'text', 'reviewText', 'localizedReviewText'];
const dateKeys = ['localizedDate', 'date', 'createdAt'];
const monthNumbers = new Map([
    ['january', 0], ['jan', 0],
    ['february', 1], ['feb', 1],
    ['march', 2], ['mar', 2],
    ['april', 3], ['apr', 3],
    ['may', 4],
    ['june', 5], ['jun', 5],
    ['july', 6], ['jul', 6],
    ['august', 7], ['aug', 7],
    ['september', 8], ['sep', 8], ['sept', 8],
    ['october', 9], ['oct', 9],
    ['november', 10], ['nov', 10],
    ['december', 11], ['dec', 11]
]);
const relativeAmounts = new Map([
    ['a', 1],
    ['an', 1],
    ['one', 1]
]);

function firstString(object, keys) {
    for (const key of keys) {
        if (typeof object[key] === 'string' && object[key].trim()) {
            return object[key].trim();
        }
    }

    return null;
}

function monthYear(date) {
    return `${date.getUTCMonth() + 1}/${date.getUTCFullYear()}`;
}

function calendarDate(year, month, day) {
    const date = new Date(Date.UTC(year, month, day));
    return date.getUTCFullYear() === year &&
        date.getUTCMonth() === month &&
        date.getUTCDate() === day
        ? date
        : null;
}

function subtractYears(date, amount) {
    const originalDay = date.getUTCDate();
    date.setUTCDate(1);
    date.setUTCFullYear(date.getUTCFullYear() - amount);
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    date.setUTCDate(Math.min(originalDay, lastDay));
}

export function normalizeReviewDate(value, now = new Date()) {
    if (typeof value !== 'string' || !value.trim()) {
        return null;
    }

    const normalized = value.trim().replace(/\s+/g, ' ');
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    let date = null;

    if (/^(?:today|just now)$/i.test(normalized)) {
        date = today;
    } else if (/^yesterday$/i.test(normalized)) {
        today.setUTCDate(today.getUTCDate() - 1);
        date = today;
    } else {
        const relativeMatch = normalized.match(/^(?:a|an|one|\d+)\s+(day|week|month|year)s?\s+ago$/i);
        if (relativeMatch) {
            const amountText = normalized.match(/^(a|an|one|\d+)/i)[1];
            const numericAmount = Number(amountText);
            const amount = Number.isNaN(numericAmount)
                ? relativeAmounts.get(amountText.toLowerCase())
                : numericAmount;
            const unit = relativeMatch[1].toLowerCase();
            date = today;

            if (unit === 'day') {
                date.setUTCDate(date.getUTCDate() - amount);
            } else if (unit === 'week') {
                date.setUTCDate(date.getUTCDate() - amount * 7);
            } else if (unit === 'month') {
                date.setUTCDate(1);
                date.setUTCMonth(date.getUTCMonth() - amount);
            } else {
                subtractYears(date, amount);
            }
        } else {
            const lastPeriodMatch = normalized.match(/^last\s+(day|week|month|year)$/i);
            if (lastPeriodMatch) {
                const unit = lastPeriodMatch[1].toLowerCase();
                date = today;
                if (unit === 'day') {
                    date.setUTCDate(date.getUTCDate() - 1);
                } else if (unit === 'week') {
                    date.setUTCDate(date.getUTCDate() - 7);
                } else if (unit === 'month') {
                    date.setUTCDate(1);
                    date.setUTCMonth(date.getUTCMonth() - 1);
                } else {
                    subtractYears(date, 1);
                }
            }
        }
    }

    if (!date) {
        const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
        const namedDateMatch = normalized.match(/^([A-Za-z]+)\s+(?:(\d{1,2})(?:,\s*)?)?(\d{4})$/);
        if (isoMatch) {
            date = calendarDate(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
        } else if (namedDateMatch && monthNumbers.has(namedDateMatch[1].toLowerCase())) {
            date = calendarDate(
                Number(namedDateMatch[3]),
                monthNumbers.get(namedDateMatch[1].toLowerCase()),
                Number(namedDateMatch[2] ?? 1)
            );
        }
    }

    return date ? monthYear(date) : null;
}

// Airbnb sends some review text with HTML line breaks ("<br/>") and entities ("&amp;"). Turns breaks
// into newlines, drops any other tags, and decodes entities, so the site shows plain text.
export function cleanReviewText(text) {
    const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
    return String(text ?? '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code) => {
            if (code[0] === '#') {
                const value = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1));
                return Number.isFinite(value) ? String.fromCodePoint(value) : match;
            }
            return entities[code.toLowerCase()] ?? match;
        })
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function normalizeReview(review, now = new Date()) {
    const rating = Number(review.rating ?? review.ratingValue);
    const text = cleanReviewText(firstString(review, reviewTextKeys));
    const date = normalizeReviewDate(firstString(review, dateKeys), now);

    if (!Number.isFinite(rating) || !text) {
        return null;
    }

    return {
        id: String(review.id ?? review.reviewId ?? `${date ?? 'unknown'}:${text}`),
        rating,
        date,
        text
    };
}

export function collectReviews(value, reviews = []) {
    if (!value || typeof value !== 'object') {
        return reviews;
    }

    if (Array.isArray(value)) {
        value.forEach(item => collectReviews(item, reviews));
        return reviews;
    }

    const review = normalizeReview(value);
    if (review) {
        reviews.push(review);
    }

    Object.values(value).forEach(item => collectReviews(item, reviews));
    return reviews;
}

function uniqueReviews(reviews) {
    return [...new Map(reviews.map(review => [review.id, review])).values()];
}

// Every review on the listing, with its star rating.
async function fetchAllReviews(listingId) {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
        locale: 'en-US',
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131 Safari/537.36'
    });
    const reviewResponses = [];
    const pendingResponses = [];

    page.on('response', async response => {
        if (!/review/i.test(response.url()) || !response.headers()['content-type']?.includes('json')) {
            return;
        }

        pendingResponses.push(response.json()
            .then(payload => reviewResponses.push(payload))
            .catch(() => {}));
    });

    await page.goto(reviewsUrl(listingId), { waitUntil: 'domcontentloaded', timeout: 60_000 });
    const showAllReviews = page.getByRole('button', { name: /show all \d+ reviews/i }).first();
    const hasReviewsButton = await showAllReviews.waitFor({ timeout: 30_000 }).then(() => true, () => false);
    if (!hasReviewsButton) {
        // A listing with no reviews yet has no button; Airbnb labels it a new listing instead.
        const pageText = await page.locator('body').innerText();
        await browser.close();
        if (/\bno reviews\b|\bnew listing\b/i.test(pageText)) {
            return [];
        }
        throw new Error('Could not find the "Show all reviews" button on the Airbnb listing');
    }
    const expectedReviewCount = Number((await page.locator('body').innerText()).match(/from (\d+) reviews/i)?.[1] ?? 0);
    await showAllReviews.click();

    // Airbnb loads reviews about 24 at a time as the pop-up scrolls, so keep scrolling until every
    // review has arrived, or until several scrolls in a row bring no new ones.
    const collected = async () => {
        await Promise.allSettled(pendingResponses);
        return uniqueReviews(reviewResponses.flatMap(payload => collectReviews(payload))).length;
    };
    const dialog = page.getByRole('dialog').last();
    await dialog.waitFor({ timeout: 30_000 }).catch(() => {});
    let lastCount = -1;
    for (let attempt = 0, stalls = 0; attempt < 200 && stalls < 8; attempt += 1) {
        await dialog.evaluate(root => {
            // The scrolling element is somewhere inside the pop-up; scroll every scrollable one to the bottom.
            const scrollables = [root, ...root.querySelectorAll('*')].filter(element =>
                element.scrollHeight > element.clientHeight + 10 && /auto|scroll/.test(getComputedStyle(element).overflowY));
            scrollables.forEach(element => { element.scrollTop = element.scrollHeight; });
        }).catch(() => {});
        await page.waitForTimeout(700);

        const count = await collected();
        if (expectedReviewCount && count >= expectedReviewCount) break;
        stalls = count === lastCount ? stalls + 1 : 0;
        lastCount = count;
    }

    await page.waitForTimeout(1_000);
    await Promise.allSettled(pendingResponses);

    const allReviews = uniqueReviews(reviewResponses.flatMap(payload => collectReviews(payload)));
    if (expectedReviewCount && allReviews.length < expectedReviewCount) {
        await browser.close();
        throw new Error(`Only collected ${allReviews.length} of Airbnb's ${expectedReviewCount} reviews`);
    }

    await browser.close();
    return allReviews;
}

// The overall rating (average stars, to 2 decimals like Airbnb shows) and count cover every review,
// so the site's "Rated X from N reviews" is accurate; only the five-star reviews are kept for display.
// A listing with no reviews yet gets a null rating and a count of 0, and the site leaves reviews out.
export function summarizeReviews(allReviews) {
    const rated = allReviews.filter(review => Number.isFinite(review.rating));
    if (!rated.length) {
        return { rating: null, count: 0, reviews: [] };
    }

    const average = rated.reduce((sum, review) => sum + review.rating, 0) / rated.length;
    return {
        rating: Math.round(average * 100) / 100,
        count: rated.length,
        reviews: rated.filter(review => review.rating === 5)
    };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const siteId = await resolveSiteId(process.argv[2]);
    const { listingId } = (await loadSiteConfig(siteId)).airbnb;
    const outputPath = sitePaths(siteId).reviews;
    const { rating, count, reviews } = summarizeReviews(await fetchAllReviews(listingId));

    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify({
        listingId,
        listingUrl: reviewsUrl(listingId),
        fetchedAt: new Date().toISOString(),
        rating,
        count,
        reviews
    }, null, 2)}\n`, 'utf8');

    console.log(`${siteId}: rated ${rating} from ${count} reviews; wrote ${reviews.length} five-star reviews`);
}