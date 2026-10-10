'use client';

import { useEffect, useRef, useState } from 'react';
import { pageIndexParam, useUrlParams } from '../lib/url-params.js';

const PAGE_SIZE = 3;

// A review's star rating as filled and empty stars, such as "★★★★☆" for 4.
function stars(rating) {
    const filled = Math.min(5, Math.max(0, Math.round(Number(rating) || 0)));
    return '★'.repeat(filled) + '☆'.repeat(5 - filled);
}

// Airbnb guest reviews, 3 per page, with "Read more" for reviews too long for their card.
// Rendered to HTML at build time, so the first page is visible without JavaScript. Past the first page, the page is
// kept in the URL (?reviews=2).
export default function Reviews({ reviews }) {
    const [reviewPage, setReviewPage] = useState(0);
    const [expandedReviews, setExpandedReviews] = useState(new Set());
    const [overflowingReviews, setOverflowingReviews] = useState(new Set());
    const reviewTextRefs = useRef({});

    const pageCount = Math.ceil(reviews.length / PAGE_SIZE);
    const pageReviews = reviews.slice(reviewPage * PAGE_SIZE, (reviewPage + 1) * PAGE_SIZE);

    useUrlParams(
        params => {
            const page = pageIndexParam(params, 'reviews');
            if (page !== null && pageCount > 0) {
                setReviewPage(Math.min(page, pageCount - 1));
            }
        },
        { reviews: reviewPage > 0 ? reviewPage + 1 : null },
        'reviews'
    );

    // Show "Read more" only on reviews whose text is cut off by the card's max height.
    useEffect(() => {
        const measureOverflow = () => {
            setOverflowingReviews(current => {
                const overflowing = new Set(current);
                let changed = false;

                pageReviews.forEach(review => {
                    if (expandedReviews.has(review.id)) {
                        return;
                    }

                    const element = reviewTextRefs.current[review.id];
                    const isOverflowing = element && element.scrollHeight > element.clientHeight + 1;
                    const wasOverflowing = overflowing.has(review.id);

                    if (isOverflowing && !wasOverflowing) {
                        overflowing.add(review.id);
                        changed = true;
                    } else if (!isOverflowing && wasOverflowing) {
                        overflowing.delete(review.id);
                        changed = true;
                    }
                });

                return changed ? overflowing : current;
            });
        };

        measureOverflow();
        window.addEventListener('resize', measureOverflow);
        return () => window.removeEventListener('resize', measureOverflow);
    }, [reviewPage, reviews, expandedReviews]);

    if (!reviews.length) {
        return <p className="reviews-status">Reviews are being refreshed. Please check back soon.</p>;
    }

    const toggleReview = reviewId => {
        setExpandedReviews(current => {
            const next = new Set(current);
            if (next.has(reviewId)) {
                next.delete(reviewId);
            } else {
                next.add(reviewId);
            }
            return next;
        });
    };

    const moveReviewPage = direction => {
        setReviewPage(currentPage => (currentPage + direction + pageCount) % pageCount);
    };

    return (
        <div className="reviews-carousel">
            <button
                className="review-nav"
                type="button"
                aria-label="Previous reviews"
                title="Previous reviews"
                disabled={pageCount <= 1}
                onClick={() => moveReviewPage(-1)}
            >
                ←
            </button>
            <div className="reviews-grid">
                {pageReviews.map(review => {
                    const isExpanded = expandedReviews.has(review.id);

                    return (
                        <article className="review-card" key={review.id}>
                            <div className="review-card-header">
                                <span className="review-rating" aria-label={`${review.rating} out of 5 stars`}>
                                    {stars(review.rating)}
                                </span>
                                <time className="review-date">{review.date || ''}</time>
                            </div>
                            <p
                                className={`review-text${isExpanded ? ' is-expanded' : ''}`}
                                ref={element => {
                                    if (element) {
                                        reviewTextRefs.current[review.id] = element;
                                    } else {
                                        delete reviewTextRefs.current[review.id];
                                    }
                                }}
                            >
                                {`“${String(review.text || '')}”`}
                            </p>
                            {overflowingReviews.has(review.id) && (
                                <button
                                    className="review-expand"
                                    type="button"
                                    aria-expanded={isExpanded}
                                    onClick={() => toggleReview(review.id)}
                                >
                                    {isExpanded ? 'Show less' : 'Read more'}
                                </button>
                            )}
                            <p className="review-label">Airbnb guest review</p>
                        </article>
                    );
                })}
            </div>
            <button
                className="review-nav"
                type="button"
                aria-label="Next reviews"
                title="Next reviews"
                disabled={pageCount <= 1}
                onClick={() => moveReviewPage(1)}
            >
                →
            </button>
        </div>
    );
}
