import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewPopupUrl, reviewsUrl, vrboRateLimitMessage } from './fetch-vrbo-reviews.mjs';

test('builds the Vrbo listing URL from the property ID', () => {
    assert.equal(reviewsUrl('5039645'), 'https://www.vrbo.com/5039645');
});

test('links every Vrbo review to the listing review pop-up', () => {
    assert.equal(reviewPopupUrl('5039645'), 'https://www.vrbo.com/5039645?pwaDialog=product-reviews');
});

test('explains Vrbo rate limits and includes the Retry-After hint', () => {
    assert.equal(
        vrboRateLimitMessage('120'),
        'Vrbo returned HTTP 429 (rate limited). Stop the run and try again later. Retry-After: 120. Changing the User-Agent will not bypass this limit.'
    );
    assert.equal(
        vrboRateLimitMessage(undefined),
        'Vrbo returned HTTP 429 (rate limited). Stop the run and try again later. Changing the User-Agent will not bypass this limit.'
    );
});
