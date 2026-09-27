'use client';

import { useEffect, useRef, useState } from 'react';

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

// The page size for the current screen width, updated when the window is resized or rotated.
function usePageSize() {
    const [pageSize, setPageSize] = useState(DESKTOP_PAGE_SIZE);

    useEffect(() => {
        const queries = PAGE_SIZES_BY_SCREEN.map(([query, size]) => [window.matchMedia(query), size]);
        const update = () => setPageSize(queries.find(([query]) => query.matches)?.[1] ?? DESKTOP_PAGE_SIZE);
        update();
        queries.forEach(([query]) => query.addEventListener('change', update));
        return () => queries.forEach(([query]) => query.removeEventListener('change', update));
    }, []);

    return pageSize;
}

function photoDescription(photo) {
    return String(photo.description || '').trim();
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

// Photos in Airbnb's order, 9 per page on desktop (6 on tablets, 2 on phones), with room filters and
// a full-size pop-up. Rendered to HTML at build time, so the first page is visible without JavaScript.
// basePath is the site's subfolder ("" for a site at the root of its domain).
export default function Gallery({ photos, siteName, basePath = '' }) {
    const [room, setRoom] = useState(null);
    // The first photo shown, rather than a page number, so a change in page size (rotating a tablet,
    // resizing the window) keeps the photos being looked at on screen.
    const [firstIndex, setFirstIndex] = useState(0);
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const pageSize = usePageSize();
    const lightboxRef = useRef(null);

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

    // Rooms in the order they first appear in the gallery.
    const rooms = [...new Set(photos.map(photo => photo.room).filter(Boolean))];
    const filteredPhotos = room ? photos.filter(photo => photo.room === room) : photos;
    const pageCount = Math.ceil(filteredPhotos.length / pageSize);
    const galleryPage = Math.min(Math.floor(firstIndex / pageSize), pageCount - 1);
    const pagePhotos = filteredPhotos.slice(galleryPage * pageSize, (galleryPage + 1) * pageSize);

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
            className="gallery-filter"
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
