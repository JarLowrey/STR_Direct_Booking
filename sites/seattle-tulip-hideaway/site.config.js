// Everything specific to this listing: the site's text, house rules, links, Airbnb listing, and
// where it deploys. See sites/rainier-getaway/site.config.js for what each field does.
//
// Text is taken from the Airbnb listing (https://www.airbnb.com/rooms/594865953049740631).

export default {
    name: 'Seattle Tulip Hideaway',
    // Shown in the footer copyright line.
    company: 'Seattle Tulip Hideaway',
    // The site lives at the repository's GitHub Pages address until a custom domain is set up. For
    // seattletuliphideaway.com, change this to https://seattletuliphideaway.com/ and add a public/CNAME file.
    url: 'https://jarlowrey.github.io/SeattleTulipHideaway/',
    // Seattle requires the short-term rental license number on every advertisement; shown in the footer.
    license: 'Seattle short-term rental license STR-OPLI-22-001317',

    deploy: {
        repository: 'JarLowrey/SeattleTulipHideaway'
    },

    airbnb: {
        listingId: '594865953049740631',
        bookingUrl: 'https://www.airbnb.com/rooms/594865953049740631'
    },

    // GitHub secret with this listing's calendar feeds (see README). Until it's added, the site
    // leaves out the availability calendar.
    calendarSecret: 'CALENDAR_FEEDS_SEATTLE_TULIP_HIDEAWAY',

    seo: {
        title: 'Seattle Tulip Hideaway | Spacious Garden Suite Near Lake Washington, Sleeps 6',
        description: 'A spacious 1,000 sq ft garden suite beneath a 150-year-old tulip tree in Seattle, about a ' +
            '5-minute walk to Lake Washington. Sleeps 6 with a king bedroom, full kitchen, and in-unit laundry.',
        shareImageAlt: 'Seattle Tulip Hideaway, a garden suite near Lake Washington in Seattle',
        structuredDescription: "Spacious 1,000 sq ft garden suite in Seattle's Mount Baker neighborhood, beneath a " +
            '150-year-old tulip tree and about a 5-minute walk to Lake Washington. Sleeps 6 with a king bedroom, a ' +
            'queen fold-out bed, a double futon, a full kitchen, in-unit laundry, and a private garden entrance.',
        identifier: 'seattle-tulip-hideaway-seattle-wa'
    },

    address: {
        street: '2124 31st Ave S',
        city: 'Seattle',
        region: 'WA',
        postalCode: '98144',
        country: 'US'
    },
    // From the US Census Bureau geocoder for the street address (estimated along the street).
    coordinates: { latitude: 47.584231, longitude: -122.292915 },

    property: {
        maxGuests: 6,
        bedrooms: 1,
        // King, queen fold-out bed, and double fold-out futon. (Airbnb counts the futon as a couch, so it lists 2.)
        beds: 3,
        bathrooms: 1,
        petsAllowed: true,
        checkinTime: '15:00:00',
        checkoutTime: '11:00:00',
        amenities: [
            'Kitchen', 'Washer', 'Dryer', 'Wifi', 'Dedicated workspace', 'Free parking', 'Lake access',
            'Beach access', 'Fenced backyard', 'Self check-in'
        ]
    },

    links: {},

    images: {
        logo: '/images/favicon/favicon.svg',
        hero: {
            src: '/images/hero.jpg',
            srcSet: '/images/hero.jpg 1200w',
            alt: 'The living room of Seattle Tulip Hideaway, a spacious garden suite near Lake Washington'
        },
        share: '/images/hero.jpg',
        favicon: {
            svg: '/images/favicon/favicon.svg',
            png32: '/images/favicon/favicon-32x32.png',
            png16: '/images/favicon/favicon-16x16.png',
            appleTouch: '/images/favicon/apple-touch-icon.png',
            manifest: '/images/favicon/site.webmanifest'
        },
        notFoundBackground: '/images/hero.jpg'
    },

    hero: {
        subtitle: 'Seattle · 5-Minute Walk to Lake Washington',
        heading: 'A Spacious Garden Suite Beneath a 150-Year-Old Tulip Tree',
        description: 'A private 1,000 sq ft garden suite for up to 6 guests, a short walk from Lake Washington, ' +
            'with beaches, parks, and quick train rides into the city nearby.',
        cta: 'Book Your Stay'
    },

    stats: [
        { value: '6', label: 'Guests' },
        { value: '3', label: 'Beds (king, queen, futon)' },
        { value: '1,000', label: 'Square feet' },
        { value: '5 min', label: 'Walk to Lake Washington' }
    ],

    features: {
        tag: 'Why Stay Here',
        title: 'A Hidden Garden Beneath a Grand Old Tree',
        description: "A private, remodeled garden suite in Seattle's Mount Baker neighborhood, with space for the " +
            'whole group, a short walk from Lake Washington.',
        items: [
            {
                icon: '🚆',
                title: 'Easy Trips Downtown',
                text: 'The Mount Baker and Judkins Park light rail stations are each under a mile away, with trains ' +
                    'downtown, to Bellevue, and to the airport, and buses nearby.'
            },
            {
                icon: '🌊',
                title: 'Steps from the Lake',
                text: 'Lake Washington is about a 5-minute walk away, with Colman Park and Mount Baker Park even closer.'
            },
            {
                icon: '🛋️',
                title: 'Room for Everyone',
                text: 'A 1,000 sq ft suite with two living areas, a king bedroom, a full kitchen, and in-unit laundry.'
            }
        ]
    },

    gallery: {
        title: 'Explore the Suite'
    },

    amenities: {
        title: 'What This Place Offers',
        description: 'Completely remodeled in 2016, with new floors, kitchen, and bathroom.',
        categories: [
            {
                icon: '🛏️',
                title: 'Living & Sleeping',
                items: [
                    ['👑', 'King bed with large windows and blackout shades'],
                    ['🛏️', 'Queen fold-out bed and a double fold-out futon'],
                    ['🛋️', 'Two living areas with a large modular couch'],
                    ['📺', 'HDTV with Chromecast and cable'],
                    ['🎲', 'Board games, books, and reading material'],
                    ['🌡️', 'Radiant heating and portable fans (no air conditioning)']
                ]
            },
            {
                icon: '🍳',
                title: 'Kitchen',
                items: [
                    ['🍳', 'Stove, oven, microwave, and dishwasher'],
                    ['🧊', 'Full-size refrigerator and freezer'],
                    ['☕', 'Drip coffee maker, coffee, kettle, and toaster'],
                    ['🥤', 'Blender and rice maker'],
                    ['🥘', 'Pots and pans, baking sheet, and cooking basics'],
                    ['🍷', 'Dishes, silverware, wine glasses, and a dining table']
                ]
            },
            {
                icon: '🌳',
                title: 'Outdoors & Location',
                items: [
                    ['🌳', 'A 150-year-old tulip tree on the property'],
                    ['🌊', 'About a 5-minute walk to Lake Washington'],
                    ['🏖️', 'Mount Baker Beach, half a mile away, with a pier and summer lifeguards'],
                    ['🛝', 'Mount Baker Park and its big playground, half a mile away'],
                    ['🌿', 'Shared, fully fenced backyard'],
                    ['🚪', 'Private entrance through the garden'],
                    ['🚆', 'Mount Baker and Judkins Park light rail stations, each under a mile']
                ]
            },
            {
                icon: '🧺',
                title: 'Practical',
                items: [
                    ['🧺', 'Free in-unit washer and dryer, iron, and drying rack'],
                    ['💻', 'Dedicated workspace with a monitor and ergonomic chair'],
                    ['🍼', "Pack 'n play (on request), high chair, and children's dinnerware"],
                    ['🔑', 'Self check-in with a smart lock'],
                    ['🅿️', 'Free parking on the property and on the street'],
                    ['🐾', 'Pets allowed']
                ]
            }
        ]
    },

    location: {
        title: "Garden Suite in Seattle's Mount Baker Neighborhood",
        highlight: 'About a 5-minute walk to Lake Washington',
        text: "The suite sits beneath a 150-year-old tulip tree in Seattle's Mount Baker neighborhood. Mount Baker " +
            'Beach, with a pier, swimming, and ' +
            'summer lifeguards, and Mount Baker Park and its big playground are each half a mile away, and a small ' +
            'neighborhood center with restaurants and coffee is a short walk. The Mount Baker and Judkins Park light ' +
            'rail stations are both under a mile away, for trips downtown, to Bellevue, or from the airport.',
        image: {
            src: '/images/location.jpg',
            width: 1024,
            height: 683,
            alt: 'Mount Baker Beach on Lake Washington, half a mile from Seattle Tulip Hideaway'
        },
        mapDestination: {
            name: 'Mount Baker Beach',
            query: 'Mount Baker Beach, Lake Washington Blvd S, Seattle, WA'
        }
    },

    reviews: {
        title: 'What guests are saying',
        description: "Reviews from guests who've stayed in the garden suite."
    },

    booking: {
        platformText: 'Book your stay through Airbnb.'
    },

    faq: {
        title: 'Planning Your Stay',
        heading: 'Garden Suite Questions',
        items: [
            {
                question: 'How many guests can stay at Seattle Tulip Hideaway?',
                answer: 'Up to 6 guests. The bedroom has a king bed, the dining area has a queen fold-out bed, and ' +
                    'the living area has a double fold-out futon. Extra bedding is available.'
            },
            {
                question: 'What is the tulip tree?',
                answer: "A massive tulip tree, about 150 years old, stands on the property. Tulip trees are among the " +
                    "tallest hardwoods in North America, and they're named for their tulip-shaped flowers, which " +
                    'bloom in late spring.'
            },
            {
                question: 'How far is Lake Washington?',
                answer: 'About a 5-minute walk, with Colman Park and Mount Baker Park even closer. Mount Baker Beach, ' +
                    'with a pier, swimming, and summer lifeguards, is half a mile away.'
            },
            {
                question: 'Can I get around without a car?',
                answer: 'Yes. The Mount Baker and Judkins Park light rail stations are both under a mile away, with ' +
                    'trains to downtown, Bellevue, and the airport.'
            },
            {
                question: 'Is there parking?',
                answer: 'Yes. Parking is free and always available on the street right in front of the home.'
            },
            {
                question: 'Is there laundry and a kitchen?',
                answer: 'Yes. The suite has a free in-unit washer and dryer and a full kitchen with a stove, oven, ' +
                    'dishwasher, microwave, and full-size refrigerator.'
            },
            {
                question: 'Is there air conditioning?',
                answer: 'No. The suite has radiant heating and portable fans.'
            },
            {
                question: 'Is it good for families?',
                answer: "Yes. A pack 'n play is available on request, and there's a high chair, children's " +
                    'dinnerware, and board games, with a beach, parks, and a playground nearby.'
            },
            {
                question: 'Are pets allowed?',
                answer: "Yes. The host's dogs also use the shared backyard, and assistance animals are always welcome."
            },
            {
                question: 'What are the check-in and checkout times?',
                answer: 'Check-in is after 3:00 PM with self check-in by smart lock, and checkout is before 11:00 AM.'
            },
            {
                question: 'Are parties or smoking allowed?',
                answer: 'No. Parties, events, and smoking are not allowed, and quiet hours are 10:00 PM to 8:00 AM.'
            }
        ]
    },

    footer: {
        description: "A spacious garden suite beneath a 150-year-old tulip tree in Seattle's Mount Baker " +
            'neighborhood, a short walk from Lake Washington.'
    },

    notFound: {
        heading: "This path doesn't lead anywhere",
        text: "The page you're looking for doesn't exist. Head back to Seattle Tulip Hideaway, a spacious garden " +
            'suite a short walk from Lake Washington.',
        cta: 'Back to Seattle Tulip Hideaway'
    }
};
