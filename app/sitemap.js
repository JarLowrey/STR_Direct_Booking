import site from '../lib/current-site.js';
import { loadPhotoData, loadReviewData } from '../lib/data.js';

export const dynamic = 'force-static';

// The homepage plus every listing photo, so image search can find the gallery. lastModified is
// the latest data fetch, so it only changes when the photos or reviews do.
export default function sitemap() {
    const photoData = loadPhotoData();
    const reviewData = loadReviewData();
    const fetchDates = [photoData.fetchedAt, reviewData.fetchedAt].map(Date.parse).filter(Number.isFinite);
    const absolute = path => new URL(path, site.url).href;

    return [
        {
            url: site.url,
            lastModified: new Date(fetchDates.length ? Math.max(...fetchDates) : Date.now()),
            images: [
                ...new Set([
                    absolute(site.images.hero.src),
                    absolute(site.location.image.src),
                    ...photoData.photos.map(photo => absolute(`images/airbnb_images/${photo.file}`))
                ])
            ]
        }
    ];
}
