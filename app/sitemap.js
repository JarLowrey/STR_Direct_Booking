import site from '../lib/current-site.js';
import { loadPhotoData, loadReviewData } from '../lib/data.js';
import { absoluteUrl } from '../lib/site-urls.js';

export const dynamic = 'force-static';

// The homepage plus every listing photo, so image search can find the gallery. lastModified is
// the latest data fetch, so it only changes when the photos or reviews do.
export default function sitemap() {
    const photoData = loadPhotoData();
    const reviewData = loadReviewData();
    const fetchDates = [photoData.fetchedAt, reviewData.fetchedAt].map(Date.parse).filter(Number.isFinite);

    return [
        {
            url: site.url,
            lastModified: new Date(fetchDates.length ? Math.max(...fetchDates) : Date.now()),
            images: [
                ...new Set([
                    absoluteUrl(site.images.hero.src),
                    absoluteUrl(site.location.image.src),
                    ...photoData.photos.map(photo => absoluteUrl(`images/airbnb_images/${photo.file}`))
                ])
            ]
        }
    ];
}
