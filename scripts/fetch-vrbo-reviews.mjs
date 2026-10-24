// Collects a site's Vrbo reviews:
//
//   node scripts/fetch-vrbo-reviews.mjs [site]
//
// Writes sites/<site>/data/vrbo-reviews.json with Vrbo's overall rating, the review count, and every
// review (its rating, date, and text). A site without a vrbo.propertyId in its config is skipped.

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { collectReviews, summarizeReviews, uniqueReviews } from './fetch-airbnb-reviews.mjs';
import { loadSiteConfig, resolveSiteId, sitePaths } from './sites.mjs';

export function reviewsUrl(propertyId) {
    return 'https://www.vrbo.com/' + propertyId;
}

// Vrbo has no link to a single review, so every review links to the listing's review pop-up.
export function reviewPopupUrl(propertyId) {
    return `${reviewsUrl(propertyId)}?pwaDialog=product-reviews`;
}

// Every review on the listing, with its star rating.
async function fetchAllReviews(propertyId) {
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

    await page.goto(reviewsUrl(propertyId), { waitUntil: 'domcontentloaded', timeout: 60_000 });
    // The link reads "See all 3 reviews", which also gives the count to check against.
    const seeAllReviews = page.getByText(/see all \d+ reviews/i).first();
    const hasReviewsLink = await seeAllReviews.waitFor({ timeout: 30_000 }).then(() => true, () => false);
    if (!hasReviewsLink) {
        const pageText = await page.locator('body').innerText();
        await browser.close();
        if (/\bno reviews\b|\bnew listing\b/i.test(pageText)) {
            return [];
        }
        throw new Error('Could not find the "See all reviews" link on the Vrbo listing');
    }
    const expectedReviewCount = Number((await seeAllReviews.innerText()).match(/(\d+)\s+reviews/i)?.[1] ?? 0);
    await seeAllReviews.click();

    // Reviews arrive in batches as the pop-up scrolls, so keep scrolling until every review has
    // arrived, or until several scrolls in a row bring no new ones.
    const collected = async () => {
        await Promise.allSettled(pendingResponses);
        return uniqueReviews(reviewResponses.flatMap(payload => collectReviews(payload))).length;
    };
    const dialog = page.getByRole('dialog').last();
    await dialog.waitFor({ timeout: 30_000 }).catch(() => {});
    let lastCount = -1;
    for (let attempt = 0, stalls = 0; attempt < 200 && stalls < 8; attempt += 1) {
        await dialog.evaluate(root => {
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
    await browser.close();
    if (expectedReviewCount && allReviews.length < expectedReviewCount) {
        throw new Error(`Only collected ${allReviews.length} of Vrbo's ${expectedReviewCount} reviews`);
    }
    return allReviews;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const siteId = await resolveSiteId(process.argv[2]);
    const { propertyId } = (await loadSiteConfig(siteId)).vrbo ?? {};
    if (!propertyId) {
        console.log(`${siteId}: no Vrbo listing configured; skipping`);
    } else {
        const outputPath = sitePaths(siteId).vrboReviews;
        const { rating, count, reviews } = summarizeReviews(await fetchAllReviews(propertyId));

        await mkdir(dirname(outputPath), { recursive: true });
        await writeFile(outputPath, `${JSON.stringify({
            propertyId,
            listingUrl: reviewsUrl(propertyId),
            fetchedAt: new Date().toISOString(),
            rating,
            count,
            reviews: reviews.map(review => ({ ...review, url: reviewPopupUrl(propertyId) }))
        }, null, 2)}\n`, 'utf8');

        console.log(`${siteId}: Vrbo rated ${rating} from ${count} reviews; wrote ${reviews.length} reviews`);
    }
}
