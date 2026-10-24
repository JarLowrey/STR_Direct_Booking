// Joins a site's Airbnb and Vrbo reviews into the one list the page shows. Each review gets its source,
// so the page can label it, and Vrbo's ids are prefixed so they can't collide with Airbnb's.
export function mergeReviewSources(airbnbReviews, vrboReviews) {
    return [
        ...airbnbReviews.map(review => ({ ...review, source: 'airbnb' })),
        ...vrboReviews.map(review => ({ ...review, id: `vrbo:${review.id}`, source: 'vrbo' }))
    ];
}
