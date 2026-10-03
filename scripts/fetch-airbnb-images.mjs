// Downloads every photo from a site's Airbnb listing photo tour, in gallery order:
//
//   node scripts/fetch-airbnb-images.mjs [site]
//
// Photos go to sites/<site>/public/images/airbnb_images/ (e.g. 3f9a1c2b7d4e8f60.jpg, named after
// the photo's Airbnb URL) plus a metadata.json with each photo's order, room, and caption. WebP
// thumbnails in two sizes (3f9a1c2b7d4e8f60-480.webp, 3f9a1c2b7d4e8f60-800.webp) go to
// sites/<site>/public/images/airbnb_thumbnails/ for the gallery grid, which picks a size per
// screen with srcset; the full-size originals are only loaded in the pop-up.
//
// Airbnb server-renders the photo tour (image URLs, captions, and the room each photo
// belongs to) into JSON inside the listing page's HTML, so we read that data directly
// rather than clicking through the UI. A plain HTTP request is tried first; a headless
// browser is only used if Airbnb blocks or changes that response.

import { createHash } from 'node:crypto';
import { mkdir, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadSiteConfig, resolveSiteId, sitePaths } from './sites.mjs';

export const METADATA_FILENAME = 'metadata.json';
// Gallery tiles are about 360-490px wide on most layouts (one ~690px column on portrait
// tablets). 480px suits regular screens; 800px covers high-density screens and that tablet column.
export const THUMBNAIL_WIDTHS = [480, 800];
// Short randomized pause between image downloads to avoid hammering Airbnb's image CDN.
export const MIN_DELAY_MS = 500;
export const MAX_DELAY_MS = 1_250;
// Default attempts per request before giving up (retries back off 5s, 10s, 20s).
export const MAX_ATTEMPTS = 4;
// Room used when Airbnb doesn't say which room a photo belongs to (matches Airbnb's own label).
export const FALLBACK_ROOM = 'Additional photos';

// A desktop Chrome user agent; Airbnb may serve a stripped-down page to unknown clients.
const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const IMAGE_EXTENSION_PATTERN = /\.(?:avif|gif|jpe?g|png|webp)$/i;
// Files this script owns in the photo and thumbnail folders (images like 3f9a1c2b7d4e8f60.jpg or
// 3f9a1c2b7d4e8f60-480.webp, plus numbered ones like 1.jpg from older runs so they get cleaned up);
// anything else there is left alone.
const OUTPUT_FILE_PATTERN = /^(?:\d+|[0-9a-f]{16})(?:-\d+)?\.(?:avif|gif|jpe?g|png|webp)$/i;

const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

// Returns the full-resolution URL for a photo belonging to this listing, or null for anything
// else (host avatars, other listings' photos, icons). Query strings are stripped because they
// only request resized/compressed variants.
export function listingUrl(listingId) {
    return `https://www.airbnb.com/rooms/${listingId}`;
}

export function originalImageUrl(value, listingId) {
    if (typeof value !== 'string') {
        return null;
    }

    let url;
    try {
        url = new URL(value);
    } catch {
        return null;
    }

    if (url.protocol !== 'https:' || !url.hostname.endsWith('.muscache.com') ||
        !url.pathname.startsWith(`/im/pictures/hosting/Hosting-${listingId}/original/`) || !IMAGE_EXTENSION_PATTERN.test(url.pathname)) {
        return null;
    }

    url.search = '';
    url.hash = '';
    return url.href;
}

function firstString(...values) {
    return values.find(value => typeof value === 'string' && value.trim())?.trim() ?? null;
}

// Parses every JSON <script> tag in the page. Airbnb puts its server-rendered page state in
// these (the photo tour lives in id="data-deferred-state-0"), but we don't depend on the exact
// id in case it changes.
export function extractPageState(html) {
    const payloads = [];
    for (const [, body] of html.matchAll(/<script\b[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi)) {
        try {
            payloads.push(JSON.parse(body));
        } catch {
            // Not every JSON script is valid or relevant; skip it.
        }
    }
    return payloads;
}

// Recursively searches the page state for photo-tour sections. We search instead of following
// a fixed path because Airbnb's deeply nested state shape changes often; the section's type
// name (or its "Photo tour" title) has been the stable marker.
function findPhotoTourSections(value, sections = []) {
    if (!value || typeof value !== 'object') return sections;
    if (Array.isArray(value)) {
        value.forEach(item => findPhotoTourSections(item, sections));
        return sections;
    }

    const isPhotoTour = value.__typename === 'PhotoTourModalSection' ||
        firstString(value.title)?.toLowerCase() === 'photo tour';
    if (isPhotoTour && Array.isArray(value.mediaItems)) {
        sections.push(value);
    }
    Object.values(value).forEach(item => findPhotoTourSections(item, sections));
    return sections;
}

export function hasPhotoTour(payloads) {
    return findPhotoTourSections(payloads).some(section => section.mediaItems.length);
}

// If several photo-tour sections turn up, the one with the most photos is the full gallery.
function findPhotoTourSection(payloads) {
    const section = findPhotoTourSections(payloads)
        .sort((left, right) => right.mediaItems.length - left.mediaItems.length)[0];

    if (!section?.mediaItems.length) {
        throw new Error('Airbnb photo tour did not contain any media items');
    }

    return section;
}

// Maps photo ID -> room title using the section's room tour, where each room (e.g. "Bedroom 1")
// lists the IDs of the photos shown under it.
function roomsFromRoomTour(section) {
    const roomByPhotoId = new Map();
    for (const layout of section.roomTourLayoutInfos ?? []) {
        for (const room of layout?.roomTourItems ?? []) {
            const title = firstString(room?.title);
            if (!title) continue;
            for (const id of room.imageIds ?? []) {
                if (!roomByPhotoId.has(String(id))) roomByPhotoId.set(String(id), title);
            }
        }
    }
    return roomByPhotoId;
}

// Uncaptioned photos get auto-generated alt text like "Living room image 3".
const AUTOMATIC_LABEL_PATTERN = /^(.*?)\s+image(?:\s+\d+)?$/i;

// Recovers the room name from an auto-generated alt text label.
function roomFromAccessibilityLabel(value) {
    const match = firstString(value)?.match(AUTOMATIC_LABEL_PATTERN);
    return match?.[1]?.trim() || null;
}

// The host's caption, or the alt text when it's a real description. Auto-generated labels
// ("Living room image 3") aren't descriptions, so those photos get a blank one.
function photoDescription(item) {
    const description = firstString(
        item.imageMetadata?.localizedCaption,
        item.imageMetadata?.caption,
        item.accessibilityLabel
    );
    return description && !AUTOMATIC_LABEL_PATTERN.test(description) ? description : '';
}

// Turns the page state into an ordered list of { id, url, room, description, order }.
export function collectListingPhotos(payloads, listingId) {
    const section = findPhotoTourSection(payloads);
    const roomByPhotoId = roomsFromRoomTour(section);

    const photos = [];
    const seenUrls = new Set();
    for (const item of section.mediaItems) {
        // The gallery can also contain videos; only still images are downloaded.
        if (item?.__typename !== 'Image') continue;

        const url = originalImageUrl(item.baseUrl, listingId);
        // Files are named after their URL, so the same image listed twice is only kept once.
        if (!url || seenUrls.has(url)) continue;
        seenUrls.add(url);

        const id = String(item.id ?? '') || url;
        photos.push({
            id,
            url,
            room: roomByPhotoId.get(id) ?? roomFromAccessibilityLabel(item.accessibilityLabel),
            description: photoDescription(item),
            order: photos.length + 1
        });
    }

    if (!photos.length) {
        throw new Error(`No listing images found for Airbnb listing ${listingId}`);
    }

    // A photo without a room shouldn't fail the whole run. Photos are grouped by room in gallery
    // order, so if the photos on both sides share a room, this one almost certainly does too;
    // otherwise use the catch-all group.
    for (let index = 0; index < photos.length; index += 1) {
        if (photos[index].room) continue;

        const previousRoom = photos.slice(0, index).reverse().find(photo => photo.room)?.room;
        const nextRoom = photos.slice(index + 1).find(photo => photo.room)?.room;
        photos[index].room = previousRoom && previousRoom === nextRoom ? previousRoom : FALLBACK_ROOM;
        console.warn(`Airbnb image ${photos[index].id} had no room; using "${photos[index].room}"`);
    }

    return photos;
}

// Runs `action` up to `attempts` times, doubling the wait between tries (5s, 10s, 20s, ...),
// and rethrows the last error if every attempt fails.
export async function withRetries(action, {
    attempts = MAX_ATTEMPTS,
    wait = sleep,
    label = 'request'
} = {}) {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
            return await action(attempt);
        } catch (error) {
            lastError = error;
            if (attempt === attempts) break;
            const backoff = 5_000 * 2 ** (attempt - 1);
            console.warn(`${label} failed (attempt ${attempt}/${attempts}): ${error.message}; retrying in ${backoff / 1000}s`);
            await wait(backoff);
        }
    }
    throw lastError;
}

// Fast path: download the listing HTML and read the page state from it, no browser needed.
async function fetchPayloadsOverHttp(listingId, fetchPage = fetch) {
    const response = await fetchPage(listingUrl(listingId), {
        headers: {
            'User-Agent': USER_AGENT,
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'en-US,en;q=0.9'
        }
    });
    if (!response.ok) {
        throw new Error(`Airbnb listing page returned ${response.status} ${response.statusText}`);
    }

    const payloads = extractPageState(await response.text());
    if (!hasPhotoTour(payloads)) {
        throw new Error('Airbnb listing page HTML did not include photo-tour state');
    }
    return payloads;
}

// Fallback for when Airbnb blocks plain HTTP clients (common from CI servers) or stops
// server-rendering the photo tour. Playwright is imported lazily so the fast path and the
// tests don't need it installed.
async function fetchPayloadsWithBrowser(listingId) {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    try {
        const page = await browser.newPage({ locale: 'en-US', userAgent: USER_AGENT });
        // Also capture JSON API responses, in case the photo tour arrives by API call instead of
        // being embedded in the HTML.
        const responsePayloads = [];
        page.on('response', async response => {
            if (!response.headers()['content-type']?.toLowerCase().includes('json')) return;
            const payload = await response.json().catch(() => null);
            if (payload) responsePayloads.push(payload);
        });

        // This query parameter opens the photo tour directly, so nothing has to be clicked.
        await page.goto(`${listingUrl(listingId)}?modal=PHOTO_TOUR_SCROLLABLE`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
        // Give API calls a chance to finish. Airbnb's analytics requests can keep the network
        // busy indefinitely, so a timeout here is expected and not an error.
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

        const payloads = [...extractPageState(await page.content()), ...responsePayloads];
        if (!hasPhotoTour(payloads)) {
            throw new Error('Airbnb photo-tour state was not found in the rendered page or its JSON responses');
        }
        return payloads;
    } finally {
        await browser.close();
    }
}

// Gets the listing's photos, trying plain HTTP (3 attempts) before the headless browser
// (2 attempts). The fetchers are parameters so tests can stub them.
export async function loadListingPhotos({
    listingId,
    fetchPage = fetch,
    loadWithBrowser = fetchPayloadsWithBrowser,
    wait = sleep
} = {}) {
    try {
        const payloads = await withRetries(() => fetchPayloadsOverHttp(listingId, fetchPage), {
            attempts: 3, wait, label: 'Fetching Airbnb listing page'
        });
        return collectListingPhotos(payloads, listingId);
    } catch (error) {
        console.warn(`Plain HTTP fetch failed (${error.message}); falling back to a headless browser`);
    }

    const payloads = await withRetries(() => loadWithBrowser(listingId), {
        attempts: 2, wait, label: 'Loading Airbnb listing in browser'
    });
    return collectListingPhotos(payloads, listingId);
}

export function delayBetween(min = MIN_DELAY_MS, max = MAX_DELAY_MS, random = Math.random()) {
    return Math.round(min + random * (max - min));
}

// Picks a file extension from the response's Content-Type, falling back to the URL's extension.
function extensionFor(contentType, sourceUrl) {
    const type = contentType.split(';')[0].toLowerCase();
    const extensions = new Map([
        ['image/avif', '.avif'],
        ['image/gif', '.gif'],
        ['image/jpeg', '.jpg'],
        ['image/png', '.png'],
        ['image/webp', '.webp']
    ]);
    return extensions.get(type) ?? (extname(new URL(sourceUrl).pathname).toLowerCase() || '.jpg');
}

// Resizes an image to `width` wide (never enlarging) and encodes it as WebP. Returns the actual
// width too, since a small original stays smaller than requested. sharp is imported lazily so
// the tests, which stub this out, don't need it installed.
export async function createThumbnail(image, width) {
    const { default: sharp } = await import('sharp');
    const { data, info } = await sharp(image)
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 75 })
        .toBuffer({ resolveWithObject: true });
    return { data, width: info.width };
}

// The file name (without extension) for a photo: a hash of its Airbnb URL. Naming files after
// their gallery position meant reordering photos on Airbnb put different photos under the same
// names, and browsers that had cached the old ones showed them under the new rooms and captions.
export function photoFileBase(url) {
    return createHash('sha256').update(url).digest('hex').slice(0, 16);
}

// Moves the freshly staged files into `targetDir`, first removing the numbered images from the
// previous run because the listing may now have fewer photos (e.g. a stale 60.jpg).
async function replaceNumberedFiles(stagingDir, targetDir, fileNames) {
    await mkdir(targetDir, { recursive: true });
    const staleFiles = (await readdir(targetDir))
        .filter(file => file === METADATA_FILENAME || OUTPUT_FILE_PATTERN.test(file));
    await Promise.all(staleFiles.map(file => rm(join(targetDir, file))));

    for (const file of fileNames) {
        await rename(join(stagingDir, file), join(targetDir, file));
    }
}

// Downloads each photo as <name>.<ext>, writes <name>-<width>.webp thumbnails, and writes
// metadata.json, replacing the previous set. `wait`, `random`, `fetchImage`, and
// `makeThumbnail` are parameters so tests can run without real delays, network access, or sharp.
export async function downloadImages({
    photos,
    listingId,
    outputDir,
    thumbnailDir,
    wait = sleep,
    random = Math.random,
    fetchImage = fetch,
    makeThumbnail = createThumbnail
}) {
    if (!Array.isArray(photos) || !photos.length) {
        throw new Error('No Airbnb listing photos were provided for download');
    }

    // Download into a staging directory first, so a failed run leaves the current images,
    // thumbnails, and metadata untouched instead of half-replaced.
    const stagingDir = `${outputDir}.staging`;
    const thumbnailStagingDir = join(stagingDir, 'thumbnails');
    await rm(stagingDir, { recursive: true, force: true });
    await mkdir(thumbnailStagingDir, { recursive: true });

    try {
        const metadata = [];
        for (const [index, photo] of photos.entries()) {
            if (index > 0) await wait(delayBetween(MIN_DELAY_MS, MAX_DELAY_MS, random()));

            const url = originalImageUrl(photo.url, listingId);
            if (!url) {
                throw new Error(`Airbnb photo ${photo.id ?? index + 1} does not have a valid listing image URL`);
            }

            const { extension, body } = await withRetries(async () => {
                const response = await fetchImage(url, { headers: { 'User-Agent': USER_AGENT } });
                if (!response.ok) {
                    throw new Error(`${response.status} ${response.statusText}`);
                }
                return {
                    extension: extensionFor(response.headers.get('content-type') ?? '', url),
                    body: Buffer.from(await response.arrayBuffer())
                };
            }, { wait, label: `Downloading image ${index + 1}` });

            const name = photoFileBase(url);
            const fileName = `${name}${extension}`;
            await writeFile(join(stagingDir, fileName), body);

            const thumbnails = [];
            for (const targetWidth of THUMBNAIL_WIDTHS) {
                const { data, width } = await makeThumbnail(body, targetWidth);
                // A small original can make both sizes come out the same; keep just one.
                if (thumbnails.some(thumbnail => thumbnail.width === width)) continue;
                const thumbnailName = `${name}-${width}.webp`;
                await writeFile(join(thumbnailStagingDir, thumbnailName), data);
                thumbnails.push({ file: thumbnailName, width });
            }

            metadata.push({
                order: photo.order,
                file: fileName,
                thumbnails,
                photoId: photo.id,
                room: photo.room,
                description: photo.description,
                sourceUrl: url
            });
            console.log(`Downloaded listing image ${index + 1}/${photos.length}`);
        }

        await writeFile(join(stagingDir, METADATA_FILENAME), `${JSON.stringify({
            listingId,
            listingUrl: listingUrl(listingId),
            fetchedAt: new Date().toISOString(),
            photoCount: metadata.length,
            photos: metadata
        }, null, 2)}\n`, 'utf8');

        // Every download succeeded, so swap the new set in. Thumbnails go first and metadata.json
        // last, so the site never references a file that hasn't been moved into place yet.
        await replaceNumberedFiles(
            thumbnailStagingDir,
            thumbnailDir,
            metadata.flatMap(photo => photo.thumbnails.map(thumbnail => thumbnail.file))
        );
        await replaceNumberedFiles(stagingDir, outputDir, [...metadata.map(photo => photo.file), METADATA_FILENAME]);
        return metadata.map(photo => join(outputDir, photo.file));
    } finally {
        await rm(stagingDir, { recursive: true, force: true });
    }
}

// Run only when executed directly (`node scripts/fetch-airbnb-images.mjs`), not when imported
// by the tests.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const siteId = await resolveSiteId(process.argv[2]);
    const { listingId } = (await loadSiteConfig(siteId)).airbnb;
    const paths = sitePaths(siteId);
    const photos = await loadListingPhotos({ listingId });
    console.log(`Found ${photos.length} photos for ${siteId} (Airbnb listing ${listingId})`);
    const files = await downloadImages({ photos, listingId, outputDir: paths.photos, thumbnailDir: paths.thumbnails });
    console.log(`Wrote ${files.length} photos, thumbnails, and metadata for ${siteId}`);
}
