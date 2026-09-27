import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import {
    FALLBACK_ROOM,
    MAX_DELAY_MS,
    MIN_DELAY_MS,
    METADATA_FILENAME,
    collectListingPhotos,
    downloadImages,
    extractPageState,
    loadListingPhotos,
    originalImageUrl
} from './fetch-airbnb-images.mjs';

const LISTING_ID = '1501508351751467254';

const imageUrl = fileName =>
    `https://a0.muscache.com/im/pictures/hosting/Hosting-${LISTING_ID}/original/${fileName}`;

const image = (id, fileName, extra = {}) => ({
    __typename: 'Image',
    id,
    baseUrl: imageUrl(fileName),
    imageMetadata: { caption: null },
    ...extra
});

const photoTourPayload = (mediaItems, roomTourItems = []) => ({
    niobeClientData: [[
        'StaysPdpSections',
        {
            data: {
                profile: { pictureUrl: 'https://a0.muscache.com/im/pictures/user/host-avatar.jpg' },
                section: {
                    __typename: 'PhotoTourModalSection',
                    title: 'Photo tour',
                    mediaItems,
                    roomTourLayoutInfos: [{ __typename: 'RoomTourLayoutInfo', roomTourItems }]
                }
            }
        }
    ]]
});

const silently = async action => {
    const { warn, log } = console;
    console.warn = () => {};
    console.log = () => {};
    try {
        return await action();
    } finally {
        console.warn = warn;
        console.log = log;
    }
};

const fakeThumbnail = async (image, width) => ({ data: Buffer.from(`${width}px thumbnail of ${image}`), width });

const imageResponse = () => ({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'image/jpeg' }),
    arrayBuffer: async () => Buffer.from('image data')
});

test('normalizes only original images belonging to this Airbnb listing', () => {
    assert.equal(
        originalImageUrl(`${imageUrl('living-room.jpg')}?im_w=1200&im_q=80#gallery`, LISTING_ID),
        imageUrl('living-room.jpg')
    );
    assert.equal(originalImageUrl('https://a0.muscache.com/im/pictures/user/guest-avatar.jpg', LISTING_ID), null);
    assert.equal(
        originalImageUrl('https://a0.muscache.com/im/pictures/hosting/Hosting-123/original/icon.jpg', LISTING_ID),
        null
    );
    assert.equal(originalImageUrl('https://example.com/logo.svg', LISTING_ID), null);
    assert.equal(originalImageUrl('not a URL', LISTING_ID), null);
});

test('extracts server-rendered JSON state from listing HTML', () => {
    const state = photoTourPayload([image('photo-1', 'one.jpg')]);
    const html = `<html><script id="data-deferred-state-0" data-deferred-state-0="true" type="application/json">${
        JSON.stringify(state)
    }</script><script type="application/json">{not json</script><script>var x = 1;</script></html>`;

    assert.deepEqual(extractPageState(html), [state]);
});

test('collects photo-tour images with rooms from the room tour, descriptions, and gallery order', () => {
    const payload = photoTourPayload([
        image('photo-1', 'living-room.jpg', {
            accessibilityLabel: 'Cozy fireplace',
            imageMetadata: { caption: 'Living room with a fireplace' }
        }),
        image('photo-2', 'bedroom.jpg', { accessibilityLabel: 'Bedroom 1 image 2' }),
        image('photo-3', 'kitchen.jpg', {
            imageMetadata: { localizedCaption: 'Kitchen with granite counters', caption: null }
        }),
        { __typename: 'Video', id: 'video-1', baseUrl: imageUrl('video.jpg') },
        image('avatar', 'ignored.jpg', { baseUrl: 'https://a0.muscache.com/im/pictures/user/avatar.jpg' })
    ], [
        { title: 'Living room', imageIds: ['photo-1'] },
        { title: 'Bedroom 1', imageIds: ['photo-2'] },
        { title: 'Full kitchen', imageIds: ['photo-3'] }
    ]);

    assert.deepEqual(collectListingPhotos([payload], LISTING_ID), [
        {
            id: 'photo-1',
            url: imageUrl('living-room.jpg'),
            room: 'Living room',
            description: 'Living room with a fireplace',
            order: 1
        },
        {
            id: 'photo-2',
            url: imageUrl('bedroom.jpg'),
            room: 'Bedroom 1',
            description: '',
            order: 2
        },
        {
            id: 'photo-3',
            url: imageUrl('kitchen.jpg'),
            room: 'Full kitchen',
            description: 'Kitchen with granite counters',
            order: 3
        }
    ]);
});

test('leaves the description blank when the only text is Airbnb\'s automatic label', () => {
    const payload = photoTourPayload([
        image('auto', 'auto.jpg', { accessibilityLabel: 'Game room 2 image 2' }),
        image('alt', 'alt.jpg', { accessibilityLabel: 'Beautiful view out the bedroom\'s window!' })
    ], [{ title: 'Game room 2', imageIds: ['auto', 'alt'] }]);

    assert.deepEqual(
        collectListingPhotos([payload], LISTING_ID).map(photo => photo.description),
        ['', 'Beautiful view out the bedroom\'s window!']
    );
});

test('falls back to accessibility labels when the room tour is missing', () => {
    const payload = {
        title: 'Photo tour',
        mediaItems: [image('title-only-photo', 'title-only.jpg', { accessibilityLabel: 'Living room image 1' })]
    };

    assert.equal(collectListingPhotos([payload], LISTING_ID).at(0).room, 'Living room');
});

test('fills unknown rooms from agreeing neighbors, otherwise uses a catch-all instead of failing', async () => {
    const payload = photoTourPayload([
        image('kitchen-1', 'kitchen-1.jpg'),
        image('mystery-1', 'mystery-1.jpg', { accessibilityLabel: 'Kitchen utensils on the counter' }),
        image('kitchen-3', 'kitchen-3.jpg'),
        image('mystery-2', 'mystery-2.jpg')
    ], [{ title: 'Full kitchen', imageIds: ['kitchen-1', 'kitchen-3'] }]);

    const photos = await silently(() => collectListingPhotos([payload], LISTING_ID));

    assert.deepEqual(photos.map(photo => photo.room), ['Full kitchen', 'Full kitchen', 'Full kitchen', FALLBACK_ROOM]);
});

test('fails clearly when the page has no photo tour', () => {
    assert.throws(() => collectListingPhotos([{ unrelated: true }], LISTING_ID), /did not contain any media items/);
});

test('loads photos over plain HTTP without launching a browser', async () => {
    const html = `<script type="application/json">${JSON.stringify(photoTourPayload(
        [image('photo-1', 'one.jpg')],
        [{ title: 'Living room', imageIds: ['photo-1'] }]
    ))}</script>`;

    const photos = await loadListingPhotos({
        listingId: LISTING_ID,
        fetchPage: async () => ({ ok: true, text: async () => html }),
        loadWithBrowser: async () => assert.fail('browser should not be used')
    });

    assert.deepEqual(photos.map(photo => photo.room), ['Living room']);
});

test('falls back to the browser when plain HTTP is blocked', async () => {
    let httpAttempts = 0;
    const photos = await silently(() => loadListingPhotos({
        listingId: LISTING_ID,
        wait: () => {},
        fetchPage: async () => {
            httpAttempts += 1;
            return { ok: false, status: 403, statusText: 'Forbidden' };
        },
        loadWithBrowser: async () => [photoTourPayload(
            [image('photo-1', 'one.jpg')],
            [{ title: 'Hot tub', imageIds: ['photo-1'] }]
        )]
    }));

    assert.equal(httpAttempts, 3);
    assert.deepEqual(photos.map(photo => photo.room), ['Hot tub']);
});

test('downloads every photo in order and writes thumbnails and its metadata manifest', async () => {
    const outputDir = 'tmp-airbnb-images-test';
    const thumbnailDir = 'tmp-airbnb-thumbnails-test';
    const waits = [];
    const requests = [];
    const photos = [
        { id: 'photo-1', url: imageUrl('one.jpg'), room: 'Living room', description: 'A living room', order: 1 },
        { id: 'photo-2', url: imageUrl('two.jpg'), room: 'Bedroom 1', description: 'A bedroom', order: 2 },
        { id: 'photo-3', url: imageUrl('three.jpg'), room: 'Full kitchen', description: 'A kitchen', order: 3 }
    ];

    try {
        await mkdir(outputDir, { recursive: true });
        await writeFile(join(outputDir, '99.jpg'), 'stale image');
        await writeFile(join(outputDir, METADATA_FILENAME), 'stale metadata');
        await mkdir(thumbnailDir, { recursive: true });
        await writeFile(join(thumbnailDir, '99.webp'), 'stale thumbnail');
        await writeFile(join(thumbnailDir, '99-480.webp'), 'stale thumbnail');

        const files = await silently(() => downloadImages({
            listingId: LISTING_ID,
            photos,
            outputDir,
            thumbnailDir,
            makeThumbnail: fakeThumbnail,
            random: () => 0,
            wait: milliseconds => waits.push(milliseconds),
            fetchImage: async url => {
                requests.push(url);
                return imageResponse();
            }
        }));

        assert.deepEqual(files.map(file => basename(file)), ['1.jpg', '2.jpg', '3.jpg']);
        assert.deepEqual(requests, photos.map(photo => photo.url));
        assert.deepEqual(waits, [MIN_DELAY_MS, MIN_DELAY_MS]);
        assert.ok(waits.every(milliseconds => milliseconds >= MIN_DELAY_MS && milliseconds <= MAX_DELAY_MS));

        const manifest = JSON.parse(await readFile(join(outputDir, METADATA_FILENAME), 'utf8'));
        assert.equal(manifest.photoCount, 3);
        assert.deepEqual(manifest.photos.map(({ order, file, thumbnails, photoId, room, description }) => ({
            order, file, thumbnails, photoId, room, description
        })), photos.map((photo, index) => ({
            order: index + 1,
            file: `${index + 1}.jpg`,
            thumbnails: [
                { file: `${index + 1}-480.webp`, width: 480 },
                { file: `${index + 1}-800.webp`, width: 800 }
            ],
            photoId: photo.id,
            room: photo.room,
            description: photo.description
        })));

        const outputFiles = await readdir(outputDir);
        assert.deepEqual(outputFiles.sort(), ['1.jpg', '2.jpg', '3.jpg', METADATA_FILENAME]);
        assert.deepEqual((await readdir(thumbnailDir)).sort(), [
            '1-480.webp', '1-800.webp', '2-480.webp', '2-800.webp', '3-480.webp', '3-800.webp'
        ]);
        assert.equal(await readFile(join(thumbnailDir, '1-480.webp'), 'utf8'), '480px thumbnail of image data');
    } finally {
        await rm(outputDir, { recursive: true, force: true });
        await rm(thumbnailDir, { recursive: true, force: true });
        await rm(`${outputDir}.staging`, { recursive: true, force: true });
    }
});

test('keeps one thumbnail when a small original makes both sizes the same width', async () => {
    const outputDir = 'tmp-airbnb-images-small-test';
    const thumbnailDir = 'tmp-airbnb-thumbnails-small-test';

    try {
        await silently(() => downloadImages({
            listingId: LISTING_ID,
            photos: [{ id: 'photo-1', url: imageUrl('one.jpg'), room: 'Gym', description: '', order: 1 }],
            outputDir,
            thumbnailDir,
            makeThumbnail: async (image, width) => ({ data: Buffer.from(image), width: Math.min(width, 400) }),
            wait: () => {},
            fetchImage: async () => imageResponse()
        }));

        const manifest = JSON.parse(await readFile(join(outputDir, METADATA_FILENAME), 'utf8'));
        assert.deepEqual(manifest.photos[0].thumbnails, [{ file: '1-400.webp', width: 400 }]);
        assert.deepEqual(await readdir(thumbnailDir), ['1-400.webp']);
    } finally {
        await rm(outputDir, { recursive: true, force: true });
        await rm(thumbnailDir, { recursive: true, force: true });
    }
});

test('retries a transient image download failure', async () => {
    const outputDir = 'tmp-airbnb-images-retry-test';
    const thumbnailDir = 'tmp-airbnb-thumbnails-retry-test';
    let calls = 0;

    try {
        const files = await silently(() => downloadImages({
            listingId: LISTING_ID,
            photos: [{ id: 'photo-1', url: imageUrl('one.jpg'), room: 'Gym', description: null, order: 1 }],
            outputDir,
            thumbnailDir,
            makeThumbnail: fakeThumbnail,
            wait: () => {},
            fetchImage: async () => {
                calls += 1;
                return calls < 3 ? { ok: false, status: 503, statusText: 'Service Unavailable' } : imageResponse();
            }
        }));

        assert.equal(calls, 3);
        assert.deepEqual(files.map(file => basename(file)), ['1.jpg']);
    } finally {
        await rm(outputDir, { recursive: true, force: true });
        await rm(thumbnailDir, { recursive: true, force: true });
    }
});

test('leaves existing images untouched when a download ultimately fails', async () => {
    const outputDir = 'tmp-airbnb-images-failure-test';
    const thumbnailDir = 'tmp-airbnb-thumbnails-failure-test';

    try {
        await mkdir(outputDir, { recursive: true });
        await writeFile(join(outputDir, '1.jpg'), 'existing image');
        await writeFile(join(outputDir, METADATA_FILENAME), 'existing metadata');
        await mkdir(thumbnailDir, { recursive: true });
        await writeFile(join(thumbnailDir, '1-480.webp'), 'existing thumbnail');

        await assert.rejects(silently(() => downloadImages({
            listingId: LISTING_ID,
            photos: [
                { id: 'photo-1', url: imageUrl('one.jpg'), room: 'Gym', description: null, order: 1 },
                { id: 'photo-2', url: imageUrl('two.jpg'), room: 'Gym', description: null, order: 2 }
            ],
            outputDir,
            thumbnailDir,
            makeThumbnail: fakeThumbnail,
            wait: () => {},
            fetchImage: async url => url.endsWith('two.jpg')
                ? { ok: false, status: 404, statusText: 'Not Found' }
                : imageResponse()
        })), /404/);

        assert.equal(await readFile(join(outputDir, '1.jpg'), 'utf8'), 'existing image');
        assert.equal(await readFile(join(outputDir, METADATA_FILENAME), 'utf8'), 'existing metadata');
        assert.equal(await readFile(join(thumbnailDir, '1-480.webp'), 'utf8'), 'existing thumbnail');
        assert.ok(!(await readdir('.')).includes(`${outputDir}.staging`));
    } finally {
        await rm(outputDir, { recursive: true, force: true });
        await rm(thumbnailDir, { recursive: true, force: true });
    }
});
