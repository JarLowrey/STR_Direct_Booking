import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewPopupUrl, reviewsUrl } from './fetch-vrbo-reviews.mjs';

test('builds the Vrbo listing URL from the property ID', () => {
    assert.equal(reviewsUrl('5039645'), 'https://www.vrbo.com/5039645');
});

test('links every Vrbo review to the listing review pop-up', () => {
    assert.equal(reviewPopupUrl('5039645'), 'https://www.vrbo.com/5039645?pwaDialog=product-reviews');
});
