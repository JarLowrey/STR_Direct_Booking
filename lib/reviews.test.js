import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeReviewSources } from './reviews.js';

test('keeps each review with its source and prefixes Vrbo ids', () => {
    assert.deepEqual(
        mergeReviewSources(
            [{ id: '1', rating: 5, date: '8/2026', text: 'Airbnb stay' }],
            [{ id: '1', rating: 4, date: '7/2026', text: 'Vrbo stay' }]
        ),
        [
            { id: '1', rating: 5, date: '8/2026', text: 'Airbnb stay', source: 'airbnb' },
            { id: 'vrbo:1', rating: 4, date: '7/2026', text: 'Vrbo stay', source: 'vrbo' }
        ]
    );
});

test('works with no Vrbo reviews', () => {
    assert.deepEqual(mergeReviewSources([], []), []);
});
