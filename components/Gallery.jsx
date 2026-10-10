'use client';

import { useEffect, useRef, useState } from 'react';
import { pageIndexParam, useUrlParams } from '../lib/url-params.js';

const PHOTO_FOLDER = '/images/airbnb_images';
const THUMBNAIL_FOLDER = '/images/airbnb_thumbnails';
// Photos per page for each gallery layout in the CSS: 9 on desktop (3 columns), 6 up to 1024px wide
// (2 columns), and 2 up to 768px (1 column, kept short so phones don't scroll far). The build renders
// the desktop size; phones and tablets switch after load.
const DESKTOP_PAGE_SIZE = 9;
const PAGE_SIZES_BY_SCREEN = [['(max-width: 768px)', 2], ['(max-width: 1024px)', 6]];
// Tile widths from the gallery CSS: one column (90vw) up to 768px, two columns up to 1024px,
// otherwise three columns capped by the grid's 1600px max width.
const GALLERY_TILE_SIZES = '(max-width: 768px) 90vw, (max-width: 1024px) 45vw, min(30vw, 490px)';

function screenPageSize() {
    return PAGE_SIZES_BY_SCREEN.find(([query]) => window.matchMedia(query).matches)?.[1] ?? DESKTOP_PAGE_SIZE;
}

// The page size for the current screen width, updated when the window is resized or rotated.
function usePageSize() {
    const [pageSize, setPageSize] = useState(DESKTOP_PAGE_SIZE);

    useEffect(() => {
        const queries = PAGE_SIZES_BY_SCREEN.map(([query]) => window.matchMedia(query));
        const update = () => setPageSize(screenPageSize());
        update();
        queries.forEach(query => query.addEventListener('change', update));
        return () => queries.forEach(query => query.removeEventListener('change', update));
    }, []);

    return pageSize;
}

// Moves the rooms in roomOrder to the front, in that order. Other rooms, and each room's photos,
// keep Airbnb's order.
function sortByRoomOrder(photos, roomOrder) {
    const rank = room => {
        const index = roomOrder.indexOf(room);
        return index === -1 ? roomOrder.length : index;
    };
    return [...photos].sort((a, b) => rank(a.room) - rank(b.room));
}

// Takes turns between rooms so the first pages show every room: each room's first photo (rooms in
// the order they appear in photos), then each room's second photo, and so on. Rooms with fewer
// photos drop out as they run out.
function interleaveByRoom(photos) {
    const photosByRoom = new Map();
    for (const photo of photos) {
        photosByRoom.set(photo.room, [...(photosByRoom.get(photo.room) ?? []), photo]);
    }

    const roomPhotos = [...photosByRoom.values()];
    const rounds = Math.max(...roomPhotos.map(list => list.length));
    return Array.from({ length: rounds }, (_, round) => roomPhotos.map(list => list[round]).filter(Boolean)).flat();
}

function photoDescription(photo) {
    return String(photo.description || '').trim();
}

// The photo's ID in the URL (?photo=), which stays the same when photos are re-downloaded or reordered.
function photoUrlId(photo) {
    return String(photo.photoId ?? photo.file);
}

function photoAlt(photo, siteName) {
    return photoDescription(photo) || `${photo.room} at ${siteName}`;
}

// Lets the browser pick the smallest thumbnail that's sharp on the viewer's screen.
function thumbnailSources(photo, basePath) {
    const thumbnails = Array.isArray(photo.thumbnails) ? photo.thumbnails : [];
    if (!thumbnails.length) {
        return { src: `${basePath}${PHOTO_FOLDER}/${photo.file}` };
    }

    return {
        src: `${basePath}${THUMBNAIL_FOLDER}/${thumbnails[0].file}`,
        srcSet: thumbnails
            .map(thumbnail => `${basePath}${THUMBNAIL_FOLDER}/${thumbnail.file} ${thumbnail.width}w`)
            .join(', '),
        sizes: GALLERY_TILE_SIZES
    };
}

// Photos taking turns between rooms (see interleaveByRoom), 9 per page on desktop (6 on tablets, 2 on phones), with room filters and
// a full-size pop-up. Rendered to HTML at build time, so the first page is visible without JavaScript.
// The room, page, and open photo are kept in the URL (?room=Kitchen&gallery=2&photo=123), so a link reopens them.
// roomOrder lists rooms to show first (see sortByRoomOrder).
// basePath is the site's subfolder ("" for a site at the root of its domain).
export default function Gallery({ photos: airbnbPhotos, roomOrder = [], siteName, basePath = '' }) {
    const photos = sortByRoomOrder(airbnbPhotos, roomOrder);
    const [room, setRoom] = useState(null);
    // The first photo shown, rather than a page number, so a change in page size (rotating a tablet,
    // resizing the window) keeps the photos being looked at on screen.
    const [firstIndex, setFirstIndex] = useState(0);
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const pageSize = usePageSize();
    const lightboxRef = useRef(null);

    // Rooms in the order they first appear in the sorted photos.
    const rooms = [...new Set(photos.map(photo => photo.room).filter(Boolean))];
    // A single room's photos stay in Airbnb's order.
    const filteredPhotos = room ? photos.filter(photo => photo.room === room) : interleaveByRoom(photos);
    const pageCount = Math.ceil(filteredPhotos.length / pageSize);
    const galleryPage = Math.min(Math.floor(firstIndex / pageSize), pageCount - 1);
    const pagePhotos = filteredPhotos.slice(galleryPage * pageSize, (galleryPage + 1) * pageSize);

    useUrlParams(
        params => {
            const urlRoom = params.get('room');
            if (rooms.includes(urlRoom)) {
                setRoom(urlRoom);
            }
            // The page as seen on this screen; past the last page shows the last.
            const page = pageIndexParam(params, 'gallery');
            if (page !== null) {
                setFirstIndex(page * screenPageSize());
            }
            const urlPhoto = photos.find(photo => photoUrlId(photo) === params.get('photo'));
            if (urlPhoto) {
                setSelectedPhoto(urlPhoto);
            }
        },
        {
            room,
            gallery: galleryPage > 0 ? galleryPage + 1 : null,
            photo: selectedPhoto && photoUrlId(selectedPhoto)
        },
        'gallery'
    );

    useEffect(() => {
        const lightbox = lightboxRef.current;
        if (!lightbox) {
            return;
        }

        if (selectedPhoto && !lightbox.open) {
            lightbox.showModal();
        } else if (!selectedPhoto && lightbox.open) {
            lightbox.close();
        }
    }, [selectedPhoto]);

    if (!photos.length) {
        return <p className="gallery-status">Photos are being refreshed. Please check back soon.</p>;
    }

    const selectRoom = nextRoom => {
        setRoom(nextRoom);
        setFirstIndex(0);
    };

    const moveGalleryPage = direction => {
        setFirstIndex(((galleryPage + direction + pageCount) % pageCount) * pageSize);
    };

    const filterButton = (label, value) => (
        <button
            key={label}
            className={value === null ? 'gallery-filter gallery-filter-all' : 'gallery-filter'}
            type="button"
            aria-pressed={room === value}
            onClick={() => selectRoom(value)}
        >
            {label}
        </button>
    );

    const selectedDescription = selectedPhoto ? photoDescription(selectedPhoto) : '';

    return (
        <>
            <div className="gallery-filters" role="group" aria-label="Filter photos by room">
                {filterButton('All photos', null)}
                {rooms.map(roomName => filterButton(roomName, roomName))}
            </div>
            <div className="gallery-carousel">
                <button
                    className="review-nav"
                    type="button"
                    aria-label="Previous photos"
                    title="Previous photos"
                    disabled={pageCount <= 1}
                    onClick={() => moveGalleryPage(-1)}
                >
                    ←
                </button>
                <div className="gallery-grid">
                    {pagePhotos.map(photo => (
                        <button
                            key={photo.file}
                            className="gallery-item"
                            type="button"
                            aria-label={`View full-size photo: ${photoDescription(photo) || photo.room}`}
                            onClick={() => setSelectedPhoto(photo)}
                        >
                            {/* Thumbnails in the grid; the full-size file loads only in the pop-up. */}
                            <img {...thumbnailSources(photo, basePath)} alt={photoAlt(photo, siteName)} loading="lazy" decoding="async" />
                            {!room && <span className="gallery-item-room">{photo.room}</span>}
                        </button>
                    ))}
                </div>
                <button
                    className="review-nav"
                    type="button"
                    aria-label="Next photos"
                    title="Next photos"
                    disabled={pageCount <= 1}
                    onClick={() => moveGalleryPage(1)}
                >
                    →
                </button>
            </div>
            <p className="gallery-page-status" aria-live="polite">
                {`${room || 'All photos'} · Page ${galleryPage + 1} of ${pageCount}`}
            </p>
            <dialog
                className="photo-lightbox"
                ref={lightboxRef}
                aria-label={selectedPhoto ? `${selectedPhoto.room} photo` : 'Photo'}
                // Escape closes the dialog natively; keep React state in sync.
                onClose={() => setSelectedPhoto(null)}
                // Clicking the dark area around the photo (the dialog or figure itself) closes it.
                onClick={event => {
                    if (event.target === event.currentTarget || event.target.tagName === 'FIGURE') {
                        setSelectedPhoto(null);
                    }
                }}
            >
                <button
                    className="photo-lightbox-close"
                    type="button"
                    aria-label="Close photo"
                    onClick={() => setSelectedPhoto(null)}
                >
                    ×
                </button>
                {selectedPhoto && (
                    <figure>
                        <img src={`${basePath}${PHOTO_FOLDER}/${selectedPhoto.file}`} alt={photoAlt(selectedPhoto, siteName)} />
                        <figcaption>
                            <div className="photo-lightbox-room">{selectedPhoto.room}</div>
                            {selectedDescription && <p className="photo-lightbox-description">{selectedDescription}</p>}
                        </figcaption>
                    </figure>
                )}
            </dialog>
        </>
    );
}
