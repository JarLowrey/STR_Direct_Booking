import test from 'node:test';
import assert from 'node:assert/strict';
import site from '../sites/rainier-getaway/site.config.js';
import { buildFaqPage, buildVacationRental, jsonLd } from './structured-data.js';

const photos = Array.from({ length: 14 }, (_, index) => ({ order: index + 1, file: `${index + 1}.jpg` }));

test('builds vacation rental structured data from the site config and photos', () => {
    const rental = buildVacationRental(site, { photos, reviewData: {} });

    assert.equal(rental['@type'], 'VacationRental');
    assert.equal(rental.name, site.name);
    assert.equal(rental.image.length, 12);
    assert.equal(rental.image[0], new URL(site.images.share, site.url).href);
    assert.equal(rental.image[1], new URL('images/airbnb_images/1.jpg', site.url).href);
    assert.equal(rental.address.postalCode, site.address.postalCode);
    assert.equal(rental.latitude, site.coordinates.latitude);
    assert.equal(rental.containsPlace.occupancy.maxValue, site.property.maxGuests);
    assert.ok(rental.sameAs.includes(`https://www.airbnb.com/rooms/${site.airbnb.listingId}`));
});

test('leaves out optional address parts and links a site does not have', () => {
    const minimal = {
        ...site,
        address: { city: 'Town', region: 'WA', country: 'US' },
        links: {},
        property: { ...site.property, checkinTime: undefined, checkoutTime: undefined }
    };
    const rental = buildVacationRental(minimal, { photos: [] });

    assert.equal(rental.address.streetAddress, undefined);
    assert.equal(rental.address.postalCode, undefined);
    assert.equal(rental.checkinTime, undefined);
    assert.deepEqual(rental.sameAs, [`https://www.airbnb.com/rooms/${site.airbnb.listingId}`]);
});

test('includes the Airbnb rating only when there are reviews', () => {
    assert.deepEqual(buildVacationRental(site, { photos, reviewData: { rating: 4.95, count: 22 } }).aggregateRating, {
        '@type': 'AggregateRating',
        ratingValue: 4.95,
        reviewCount: 22,
        bestRating: 5
    });
    assert.equal(buildVacationRental(site, { photos, reviewData: { rating: 5, count: 0 } }).aggregateRating, undefined);
});

test('builds FAQ structured data from the same questions shown on the page', () => {
    const faqPage = buildFaqPage(site.faq.items);

    assert.equal(faqPage.mainEntity.length, site.faq.items.length);
    assert.equal(faqPage.mainEntity[0].name, site.faq.items[0].question);
    assert.equal(faqPage.mainEntity[0].acceptedAnswer.text, site.faq.items[0].answer);
});

test('escapes "<" so JSON-LD text cannot close its script tag', () => {
    const output = jsonLd({ text: '</script><script>alert(1)</script>' });

    assert.doesNotMatch(output, /</);
    assert.deepEqual(JSON.parse(output), { text: '</script><script>alert(1)</script>' });
});
