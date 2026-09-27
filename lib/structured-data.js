// Schema.org structured data for a site's homepage, built from the same config and data as the
// visible page.

// Google asks for at least 8 images in vacation rental structured data.
const LISTING_PHOTO_COUNT = 11;

export function buildVacationRental(site, { photos = [], reviewData = {} } = {}) {
    // Paths in the config start at the site root; resolve them inside the site's url, which may be a subfolder.
    const absolute = path => new URL(String(path).replace(/^\//, ''), site.url).href;
    const { address, coordinates, property } = site;

    const rental = {
        '@context': 'https://schema.org',
        '@type': 'VacationRental',
        '@id': `${site.url}#rental`,
        identifier: site.seo.identifier,
        name: site.name,
        url: site.url,
        description: site.seo.structuredDescription,
        image: [
            absolute(site.images.share),
            ...photos.slice(0, LISTING_PHOTO_COUNT).map(photo => absolute(`images/airbnb_images/${photo.file}`))
        ],
        address: {
            '@type': 'PostalAddress',
            ...(address.street && { streetAddress: address.street }),
            addressLocality: address.city,
            addressRegion: address.region,
            ...(address.postalCode && { postalCode: address.postalCode }),
            addressCountry: address.country
        },
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        geo: { '@type': 'GeoCoordinates', latitude: coordinates.latitude, longitude: coordinates.longitude },
        ...(property.checkinTime && { checkinTime: property.checkinTime }),
        ...(property.checkoutTime && { checkoutTime: property.checkoutTime }),
        containsPlace: {
            '@type': 'Accommodation',
            additionalType: 'EntirePlace',
            occupancy: { '@type': 'QuantitativeValue', maxValue: property.maxGuests },
            numberOfBedrooms: property.bedrooms,
            numberOfBathroomsTotal: property.bathrooms,
            bed: { '@type': 'BedDetails', numberOfBeds: property.beds },
            ...(property.petsAllowed !== undefined && { petsAllowed: property.petsAllowed }),
            amenityFeature: (property.amenities ?? []).map(name => ({
                '@type': 'LocationFeatureSpecification',
                name,
                value: true
            }))
        },
        sameAs: [
            `https://www.airbnb.com/rooms/${site.airbnb.listingId}`,
            site.links?.vrbo,
            site.links?.instagram
        ].filter(Boolean)
    };

    // Airbnb's overall rating across all reviews, which the page also shows (Google requires ratings
    // in structured data to be visible).
    const rating = Number(reviewData.rating);
    const count = Number(reviewData.count);
    if (Number.isFinite(rating) && Number.isFinite(count) && count > 0) {
        rental.aggregateRating = { '@type': 'AggregateRating', ratingValue: rating, reviewCount: count, bestRating: 5 };
    }

    return rental;
}

export function buildFaqPage(faqItems) {
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqItems.map(({ question, answer }) => ({
            '@type': 'Question',
            name: question,
            acceptedAnswer: { '@type': 'Answer', text: answer }
        }))
    };
}

// JSON for a <script type="application/ld+json"> tag. Escaping "<" keeps text such as "</script>"
// from ending the tag early.
export function jsonLd(data) {
    return JSON.stringify(data).replace(/</g, '\\u003c');
}
