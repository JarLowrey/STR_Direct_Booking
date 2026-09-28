// Everything specific to this listing: the site's text, house rules, links, Airbnb listing, and
// where it deploys. The shared code in app/, components/, and lib/ reads it; nothing there mentions
// a particular listing. To add another listing, copy this folder to sites/<new-name>/ and edit it
// (see README "Adding a Listing").
//
// This file is plain data (no JSX) so the build, the scrapers, and the workflows can all read it.

export default {
    name: 'Rainier Getaway',
    // Legal name shown in the footer copyright line.
    company: 'Rainier Getaway LLC',
    url: 'https://rainier-getaway.com/',

    // Where the built site is published: the gh-pages branch of this repository. It can be this
    // repository or another one (publishing elsewhere needs the PAGES_DEPLOY_TOKEN secret).
    deploy: {
        repository: 'JarLowrey/RainierGetawaySite'
    },

    airbnb: {
        listingId: '1501508351751467254',
        // Link for the "Book on Airbnb" button.
        bookingUrl: 'https://www.airbnb.com/h/rainiergetaway'
    },

    // Name of the GitHub secret holding this listing's calendar feeds, as a JSON array like
    // [{ "label": "Airbnb", "url": "https://www.airbnb.com/calendar/ical/..." }, { "label": "VRBO", "url": "..." }].
    // The feed URLs contain private access tokens, so they're kept out of the repository.
    calendarSecret: 'CALENDAR_FEEDS_RAINIER_GETAWAY',

    seo: {
        title: 'Mount Rainier Vacation Rental in Ashford, WA | Rainier Getaway',
        description: "Stay in Ashford, WA, 5 miles from Mount Rainier National Park's Nisqually entrance. " +
            'Sleeps 12 with a hot tub, sauna, gym, and two game lofts.',
        shareImageAlt: 'Rainier Getaway vacation rental near Mount Rainier National Park',
        // Longer description used in structured data.
        structuredDescription: "Group vacation rental in Ashford, Washington, 5 miles from Mount Rainier National " +
            "Park's Nisqually entrance. Sleeps 12 and features two game lofts, a private gym, sauna, and hot tub.",
        // Unique ID for this rental in structured data.
        identifier: 'rainier-getaway-ashford-wa'
    },

    address: {
        street: '343 Skate Creek Rd N',
        city: 'Ashford',
        region: 'WA',
        postalCode: '98304',
        country: 'US'
    },
    coordinates: { latitude: 46.736649, longitude: -121.966549 },

    property: {
        maxGuests: 12,
        bedrooms: 4,
        beds: 6,
        bathrooms: 3,
        petsAllowed: true,
        checkinTime: '16:00:00',
        checkoutTime: '11:00:00',
        // Amenities listed in structured data.
        amenities: ['Hot tub', 'Private gym', 'Two game lofts', 'Sauna', 'Fire pit', 'High-speed Wi-Fi']
    },

    links: {
        vrbo: 'https://www.vrbo.com/5039645',
        instagram: 'https://www.instagram.com/rainiergetaway',
        email: 'rainiergetawayllc@gmail.com'
    },

    // Image paths are relative to this site's public/ folder.
    images: {
        logo: '/images/favicon/favicon.svg',
        hero: {
            src: '/images/hero.jpg',
            srcSet: '/images/hero-1280.jpg 1280w, /images/hero.jpg 1920w, /images/hero-2560.jpg 2560w',
            alt: 'Exterior of Rainier Getaway, a group vacation rental in Ashford, Washington'
        },
        // Shared on social media and listed first in structured data.
        share: '/images/hero.jpg',
        favicon: {
            svg: '/images/favicon/favicon.svg',
            png32: '/images/favicon/favicon-32x32.png',
            png16: '/images/favicon/favicon-16x16.png',
            ico: '/images/favicon/favicon.ico',
            appleTouch: '/images/favicon/apple-touch-icon.png',
            manifest: '/images/favicon/site.webmanifest'
        },
        // Background for the 404 page.
        notFoundBackground: '/images/hero-1280.jpg'
    },

    hero: {
        subtitle: 'Ashford, WA · Near Mount Rainier National Park',
        heading: 'Mount Rainier Group Vacation Rental in Ashford, WA',
        description: "Gather just 5 miles from Mount Rainier National Park's Nisqually entrance. This Ashford " +
            'vacation home sleeps 12 and features two game lofts, a private gym, sauna, and hot tub.',
        cta: 'Check Availability'
    },

    stats: [
        { value: '12', label: 'Max guests' },
        { value: '4', label: 'Bedrooms (6 beds)' },
        { value: '3', label: 'Bathrooms' },
        { value: '10min', label: 'To Park Entrance' }
    ],

    features: {
        tag: 'Why Choose Us',
        title: 'Designed for Memorable Gatherings',
        description: "Whether you're planning a family reunion, friend's retreat, or team getaway, our property " +
            'offers everything you need for an unforgettable mountain experience.',
        items: [
            {
                icon: '🏔️',
                title: 'Prime Location',
                text: 'Just 10 minutes from Mt. Rainier National Park entrance with breathtaking mountain views.'
            },
            {
                icon: '🎯',
                title: 'Entertainment Hub',
                text: 'Two game lofts offer pool, ping pong, air hockey, arcade games, mini golf, foosball, and more, ' +
                    'plus a private gym and hot tub.'
            },
            {
                icon: '✨',
                title: 'Premium Comfort',
                text: 'Modern amenities meet rustic charm with exposed timber beams, gourmet kitchen, and luxurious ' +
                    'furnishings.'
            }
        ]
    },

    gallery: {
        title: 'Explore the Space'
    },

    amenities: {
        title: 'Everything You Need',
        description: 'Our property is equipped with premium amenities to ensure comfort, entertainment, and ' +
            'unforgettable experiences.',
        categories: [
            {
                icon: '🛋️',
                title: 'Living & Comfort',
                items: [
                    ['👥', 'Sleeps 12 across 4 bedrooms and 6 beds'],
                    ['🛏️', '1 King, 3 Queen, and 2 folding Full/Double beds'],
                    ['🛁', '3 modern bathrooms'],
                    ['🔥', 'Wood stove and fireplace'],
                    ['🌡️', 'Heating throughout; AC in living and dining rooms'],
                    ['🧺', 'Washer, dryer, and high-speed WiFi']
                ]
            },
            {
                icon: '🍽️',
                title: 'Kitchen & Dining',
                items: [
                    ['🍳', 'Gourmet kitchen with granite counters and professional appliances'],
                    ['🍽️', 'Large dining table with seating for 8+'],
                    ['🪑', 'Kitchen island with bar seating'],
                    ['☕', 'Coffee makers, toaster oven, dishwasher and more'],
                    ['🥄', 'Full cookware and dishware']
                ]
            },
            {
                icon: '🎯',
                title: 'Recreation & Wellness',
                items: [
                    ['🎱', 'Game Loft 1: Pool table, ping pong, air hockey, mini basketball, child-safe darts, seating, TV, and mini fridge'],
                    ['🕹️', 'Game Loft 2: Foosball, arcade games, mini golf, and gaming table'],
                    ['🏋️', 'Private gym with treadmill, rowing machine, free weights, and punching bag'],
                    ['♨️', '6-person infrared sauna with radio'],
                    ['📺', 'Multiple smart TVs']
                ]
            },
            {
                icon: '🌲',
                title: 'Outdoor',
                items: [
                    ['♨️', 'Private hot tub with LED and string lighting'],
                    ['🔥', 'Fire pit area with seating'],
                    ['🏔️', 'Private mountain and forest views'],
                    ['🧭', '5 miles to the Nisqually entrance'],
                    ['🚗', 'Ample parking'],
                    ['🐾', 'Pet-friendly; please inquire']
                ]
            }
        ]
    },

    location: {
        title: 'Vacation Rental Near Mount Rainier National Park',
        highlight: '5 miles (10 min) to Nisqually entrance',
        text: "Accessible all year. Whether you're seeking adventure or relaxation, you'll find the perfect balance " +
            'here. From hiking and wildlife viewing to cozy evenings by the fire, every moment becomes a memory.',
        image: {
            src: '/images/rainier.jpg',
            width: 1528,
            height: 900,
            alt: 'Mountain view near Mount Rainier National Park from the Ashford vacation rental'
        },
        // Optional: the map shows directions from the property to this place. Add
        // travelMode: 'walking' (or 'transit' or 'bicycling') for other than driving directions.
        mapDestination: {
            name: 'Nisqually Entrance, Mount Rainier National Park',
            query: 'Nisqually Entrance, Mount Rainier National Park, WA'
        }
    },

    reviews: {
        title: "Here's what people are saying",
        description: 'A few words from guests who have made Rainier Getaway part of their mountain story.'
    },

    booking: {
        // Optional: omit `direct` to show only the platform booking links.
        direct: {
            title: 'Book Direct With Confidence and Save 10%',
            url: 'https://docs.google.com/forms/d/1P4zrzBh5_M9ItTD8iGvubHM_zeDbUCXZ_BLdG_O9oxI',
            // Optional: tabs with the direct-booking terms. Each tab's content is a list of blocks: a string is
            // a paragraph, { strong: '...' } is a bold paragraph, and { list: [...] } is a bulleted list.
            tabs: [
                {
                    id: 'payment',
                    label: 'Payments',
                    content: [
                        { strong: '30% due to reserve your dates' },
                        'The remaining balance is due 90 days before check-in.',
                        'Choose the payment method that works best for you:',
                        { list: ['Zelle (0% fee)', 'Venmo (1.9% additional fee)', 'PayPal (3.5% additional fee)'] }
                    ]
                },
                {
                    id: 'cancellation',
                    label: 'Cancellations',
                    content: [
                        'Damage deposit will always be 100% refunded if you cancel before check-in.',
                        'Trip payment refund depends on how far in advance of your check-in day you cancel:',
                        { list: ['100% refund :: 31+ days', '50% refund :: 15-30 days', '0% refund :: 0-14 days'] }
                    ]
                },
                {
                    id: 'non-refundable',
                    label: 'Non-refundable Option',
                    content: [
                        'If you choose this option, the full amount is due at time of booking.',
                        'No refunds for trip payments will be issued for cancellations made after the booking is confirmed.',
                        'An additional 10% discount will be applied.',
                        'NOTE: Damage deposit will also be due upfront, but will be refunded if you cancel before check-in.'
                    ]
                },
                {
                    id: 'misc',
                    label: 'Terms',
                    content: [
                        {
                            list: [
                                'Two-night minimum stay',
                                'Pets are allowed, with a maximum of three pets',
                                'No smoking, vaping, or e-cigarettes inside; a $250 fine applies if this rule is ignored',
                                'Quiet hours are from 10:00 PM to 8:00 AM',
                                'Maximum occupancy is 12 guests',
                                'Check-in is at 4:00 PM and check-out is at 11:00 AM'
                            ]
                        }
                    ]
                },
                {
                    id: 'deposit',
                    label: 'Deposit',
                    content: [
                        { strong: '$800 refundable damage deposit' },
                        'The deposit is refunded after your stay, provided there is no damage to the property.'
                    ]
                }
            ]
        },
        platformText: 'Prefer to book through a vacation rental platform? Use Airbnb or Vrbo below.'
    },

    faq: {
        title: 'Planning Your Mount Rainier Stay',
        heading: 'Group and Family Lodging Questions',
        // Shown on the page and in structured data.
        items: [
            {
                question: 'How many guests can stay at Rainier Getaway?',
                answer: 'Rainier Getaway accommodates up to 12 guests across four bedrooms and six beds.'
            },
            {
                question: 'How close is the home to Mount Rainier National Park?',
                answer: 'The home is approximately 5 miles, or 10 minutes, from the Nisqually entrance.'
            },
            {
                question: 'Is this a good vacation rental for families?',
                answer: 'Yes. The property includes family-friendly entertainment, a full kitchen, multiple gathering ' +
                    'spaces, outdoor amenities, and room for multigenerational groups.'
            },
            {
                question: 'Is Rainier Getaway suitable for friends or large groups?',
                answer: 'Yes. The home is designed for groups of friends, family reunions, retreats, and weekend ' +
                    "getaways in Washington's Pacific Northwest."
            },
            {
                question: 'What amenities are available?',
                answer: 'Amenities include two game lofts, a private gym, sauna, hot tub, fire pit, gourmet kitchen, ' +
                    'Wi-Fi, laundry, and ample parking.'
            }
        ]
    },

    footer: {
        description: 'Your luxury mountain retreat near Mt. Rainier National Park. Experience unforgettable moments ' +
            'with family and friends in the heart of the Pacific Northwest.'
    },

    notFound: {
        heading: "This trail doesn't lead anywhere",
        text: "The page you're looking for doesn't exist. Head back to Rainier Getaway, our group vacation rental " +
            '5 miles from Mount Rainier National Park.',
        cta: 'Back to Rainier Getaway'
    }
};
