// Everything specific to this listing: the site's text, house rules, links, Airbnb listing, and
// where it deploys. See sites/rainier-getaway/site.config.js for what each field does.
//
// Text is taken from the Airbnb listing (https://www.airbnb.com/rooms/1744627445043617491).

export default {
    name: 'Cozy Rainier Cabin',
    // Shown in the footer copyright line.
    company: 'Cozy Rainier Cabin',
    // No custom domain yet, so the site lives at the repository's GitHub Pages address. To use a
    // domain later, change this to https://your-domain.com/ and add a public/CNAME file with the domain.
    url: 'https://jarlowrey.github.io/RainierTinyHome/',

    deploy: {
        repository: 'JarLowrey/RainierTinyHome'
    },

    airbnb: {
        listingId: '1744627445043617491',
        bookingUrl: 'https://www.airbnb.com/rooms/1744627445043617491'
    },

    // GitHub secret with this listing's calendar feeds (see README). Until it's added, the site
    // leaves out the availability calendar.
    calendarSecret: 'CALENDAR_FEEDS_COZY_RAINIER_CABIN',

    seo: {
        title: 'Cozy Rainier Cabin | Creekside Cabin for Two in Ashford, WA',
        description: 'A creekside cabin for two in Ashford, WA, near Mount Rainier National Park, with a ' +
            'wood-burning fireplace, creekside fire pit, full kitchen, EV charger, and a lakeside park next door.',
        shareImageAlt: 'Cozy Rainier Cabin, a creekside cabin for two in Ashford, Washington',
        structuredDescription: 'Creekside cabin for two in Ashford, Washington, near Mount Rainier National Park. ' +
            'One bedroom with a queen bed, a wood-burning fireplace, a creekside fire pit, a full kitchen, and a ' +
            'park with lake access next door.',
        identifier: 'cozy-rainier-cabin-ashford-wa'
    },

    address: {
        street: '155 Nisqually Way',
        city: 'Ashford',
        region: 'WA',
        postalCode: '98304',
        country: 'US'
    },
    // From the US Census Bureau geocoder for the street address (estimated along the street).
    coordinates: { latitude: 46.73678, longitude: -121.987989 },

    property: {
        maxGuests: 2,
        bedrooms: 1,
        beds: 1,
        bathrooms: 1,
        petsAllowed: true,
        amenities: ['Waterfront', 'Lake access', 'Fire pit', 'Fireplace', 'Kitchen', 'Wifi', 'EV charger', 'Free parking']
    },

    links: {},

    images: {
        logo: '/images/favicon/favicon.svg',
        hero: {
            src: '/images/hero.jpg',
            // Airbnb only has this photo at 1024px wide; a larger original would look sharper on big screens.
            srcSet: '/images/hero.jpg 1024w',
            alt: 'Cozy Rainier Cabin among the trees in Ashford, Washington'
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
        subtitle: 'Ashford, WA · Near Mount Rainier National Park',
        heading: 'Creekside Cabin for Two Near Mount Rainier',
        description: 'A cozy, romantic cabin in Ashford with a wood-burning fireplace, a creekside fire pit, and a ' +
            'lakeside park right next door.',
        cta: 'Book Your Stay'
    },

    stats: [
        { value: '2', label: 'Guests' },
        { value: '1', label: 'Bedroom (queen bed)' },
        { value: '1', label: 'Bathroom' },
        // The host's rating across all of their Airbnb listings; this listing is new.
        { value: '4.92', label: 'Host rating (272 reviews)' }
    ],

    features: {
        tag: 'Why Stay Here',
        title: 'A Quiet Creekside Retreat',
        description: 'This charming home for two offers a peaceful, romantic setting surrounded by lush Northwest ' +
            'greenery. Warm cedar walls, rustic touches, and the sound of the creek make it perfect for couples ' +
            'looking to slow down and reconnect.',
        items: [
            {
                icon: '🌲',
                title: 'Next to a Lakeside Park',
                text: 'A creekside setting in Ashford with a park right next door offering lake access and trails.'
            },
            {
                icon: '🔥',
                title: 'Fireplace and Fire Pit',
                text: 'A wood-burning fireplace and a creekside fire pit for quiet evenings under the trees.'
            },
            {
                icon: '🍳',
                title: 'Ready for Home Cooking',
                text: 'A kitchen with a stove, oven, and coffee maker for easy meals between adventures.'
            }
        ]
    },

    gallery: {
        title: 'Explore the Cabin'
    },

    amenities: {
        title: 'What This Place Offers',
        description: 'Everything you need for a comfortable, cozy stay for two.',
        categories: [
            {
                icon: '🛋️',
                title: 'Comfort',
                items: [
                    ['🛏️', 'Bedroom with a queen bed, plus a couch in the living room'],
                    ['🧺', 'Bed linens, extra pillows and blankets, and room-darkening shades'],
                    ['🔥', 'Wood-burning fireplace'],
                    ['🌡️', 'Heating and a ceiling fan'],
                    ['📺', 'TV, books, and reading material'],
                    ['📶', 'Wifi']
                ]
            },
            {
                icon: '🍳',
                title: 'Kitchen',
                items: [
                    ['🍳', 'Stove, oven, and microwave'],
                    ['🧊', 'Refrigerator and freezer'],
                    ['☕', 'Coffee maker, coffee, and toaster'],
                    ['🥘', 'Pots and pans, oil, salt, and pepper'],
                    ['🍽️', 'Dishes and silverware']
                ]
            },
            {
                icon: '🌲',
                title: 'Outdoors',
                items: [
                    ['🏞️', 'Creekside setting with lake access nearby'],
                    ['🔥', 'Fire pit and outdoor furniture'],
                    ['🛝', 'Park next door with a playground, frisbee golf, and horseshoes'],
                    ['🚪', 'Private entrance'],
                    ['🦌', 'Deer frequently visit the property']
                ]
            },
            {
                icon: '🚗',
                title: 'Practical',
                items: [
                    ['🅿️', 'Free parking on the property'],
                    ['🔌', 'EV charger'],
                    ['🐾', 'Pets allowed'],
                    ['🗓️', 'Long-term stays of 28 nights or more allowed'],
                    ['🚿', 'Shampoo, conditioner, body soap, and hot water'],
                    ['🧯', 'Smoke and carbon monoxide alarms, fire extinguisher, and first aid kit']
                ]
            }
        ]
    },

    location: {
        title: 'Creekside Cabin in Ashford, Near Mount Rainier',
        highlight: 'Creekside, with a lakeside park next door',
        text: 'The cabin sits above the creek among the trees. A park next door has a lake, frisbee golf, ' +
            'horseshoes, and a playground, and Ashford is the gateway to Mount Rainier National Park\'s Nisqually ' +
            'entrance.',
        image: {
            src: '/images/location.jpg',
            width: 1024,
            height: 682,
            alt: 'Creekside setting at Cozy Rainier Cabin in Ashford, Washington'
        },
        mapDestination: {
            name: 'Nisqually Entrance, Mount Rainier National Park',
            query: 'Nisqually Entrance, Mount Rainier National Park, WA'
        }
    },

    reviews: {
        title: 'What guests are saying',
        description: "Reviews from guests who've stayed at the cabin."
    },

    booking: {
        platformText: 'Book your stay through Airbnb.'
    },

    faq: {
        title: 'Planning Your Stay',
        heading: 'Cabin Questions',
        items: [
            {
                question: 'How many guests can stay at Cozy Rainier Cabin?',
                answer: 'The cabin sleeps 2 guests in one bedroom with a queen bed. The living room also has a couch.'
            },
            {
                question: 'Are pets allowed?',
                answer: 'Yes, pets are allowed, and assistance animals are always welcome.'
            },
            {
                question: 'What is in the kitchen?',
                answer: 'A stove, oven, microwave, refrigerator, freezer, coffee maker, and toaster, plus pots and ' +
                    'pans, dishes, silverware, and cooking basics.'
            },
            {
                question: 'Is there air conditioning or laundry?',
                answer: 'No. The cabin has heating and a ceiling fan, but no air conditioning, washer, or dryer.'
            },
            {
                question: 'Can I charge an electric vehicle?',
                answer: "Yes. There's an EV charger on the property, and parking is free."
            },
            {
                question: 'What is nearby?',
                answer: 'A park right next door has a lake, frisbee golf, horseshoes, and a playground. Ashford is ' +
                    "the gateway to Mount Rainier National Park's Nisqually entrance."
            },
            {
                question: 'Can I smoke inside?',
                answer: 'No. Smoking indoors carries a $250 fee.'
            }
        ]
    },

    footer: {
        description: 'A cozy creekside cabin for two in Ashford, Washington, near Mount Rainier National Park.'
    },

    notFound: {
        heading: "This trail doesn't lead anywhere",
        text: "The page you're looking for doesn't exist. Head back to Cozy Rainier Cabin, a creekside cabin for " +
            'two near Mount Rainier National Park.',
        cta: 'Back to Cozy Rainier Cabin'
    }
};
