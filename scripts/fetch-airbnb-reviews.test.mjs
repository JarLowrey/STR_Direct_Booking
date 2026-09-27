import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanReviewText, collectReviews, normalizeReviewDate, summarizeReviews } from './fetch-airbnb-reviews.mjs';

const referenceDate = new Date('2026-01-05T12:00:00Z');

test('normalizes Airbnb relative review dates to month and year', () => {
    assert.equal(normalizeReviewDate('Today', referenceDate), '1/2026');
    assert.equal(normalizeReviewDate('Yesterday', referenceDate), '1/2026');
    assert.equal(normalizeReviewDate('1 week ago', referenceDate), '12/2025');
    assert.equal(normalizeReviewDate('3 days ago', referenceDate), '1/2026');
    assert.equal(normalizeReviewDate('2 weeks ago', referenceDate), '12/2025');
    assert.equal(normalizeReviewDate('2 months ago', referenceDate), '11/2025');
    assert.equal(normalizeReviewDate('2 years ago', referenceDate), '1/2024');
    assert.equal(normalizeReviewDate('last week', referenceDate), '12/2025');
});

test('normalizes absolute Airbnb review dates without timezone shifts', () => {
    assert.equal(normalizeReviewDate('August 2026', referenceDate), '8/2026');
    assert.equal(normalizeReviewDate('August 15, 2026', referenceDate), '8/2026');
    assert.equal(normalizeReviewDate('2026-08-31T23:00:00-07:00', referenceDate), '8/2026');
});

test('rejects invalid review dates and handles leap-day year subtraction', () => {
    assert.equal(normalizeReviewDate('February 31, 2026', referenceDate), null);
    assert.equal(
        normalizeReviewDate('1 year ago', new Date('2024-02-29T12:00:00Z')),
        '2/2023'
    );
});

test('collects valid reviews without exposing reviewer or author data', () => {
    const reviews = collectReviews({
        reviews: [
            {
                id: 'review-1',
                rating: 5,
                localizedDate: 'August 2026',
                comments: 'Wonderful stay',
                reviewer: { name: 'Private Guest', pictureUrl: 'private.jpg' },
                author: { name: 'Private Author' }
            },
            {
                id: 'invalid-review',
                rating: 4,
                localizedDate: 'August 2026',
                comments: 'Also valid, but filtered later by rating'
            }
        ]
    });

    assert.deepEqual(reviews, [
        {
            id: 'review-1',
            rating: 5,
            date: '8/2026',
            text: 'Wonderful stay'
        },
        {
            id: 'invalid-review',
            rating: 4,
            date: '8/2026',
            text: 'Also valid, but filtered later by rating'
        }
    ]);
});
test('rates the listing and keeps every review, whatever its rating, in Airbnb order', () => {
    const summary = summarizeReviews([
        { id: 'a', rating: 5, text: 'Great' },
        { id: 'b', rating: 5, text: 'Lovely' },
        { id: 'c', rating: 3, text: 'Okay' },
        { id: 'd', rating: 5, text: 'Perfect' }
    ]);

    assert.equal(summary.rating, 4.5);
    assert.equal(summary.count, 4);
    assert.deepEqual(summary.reviews.map(review => review.id), ['a', 'b', 'c', 'd']);
});

test('leaves out reviews without a rating', () => {
    assert.deepEqual(
        summarizeReviews([{ id: 'a', rating: 4, text: 'Good' }, { id: 'b', rating: NaN, text: 'No stars' }]),
        { rating: 4, count: 1, reviews: [{ id: 'a', rating: 4, text: 'Good' }] }
    );
});

test('summarizes a new listing with no reviews', () => {
    assert.deepEqual(summarizeReviews([]), { rating: null, count: 0, reviews: [] });
});

test('turns Airbnb review HTML into plain text with line breaks', () => {
    assert.equal(
        cleanReviewText('Great spot &amp; host!<br/>The beach is close.<br /><br/><br/><b>10/10</b> &#39;would&#39; return&nbsp;'),
        "Great spot & host!\nThe beach is close.\n\n10/10 'would' return"
    );
    assert.equal(cleanReviewText('Plain text'), 'Plain text');
    assert.equal(cleanReviewText(undefined), '');
});
