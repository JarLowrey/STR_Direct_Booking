import { Fragment } from 'react';
import AvailabilityCalendar from '../components/AvailabilityCalendar.jsx';
import BookingTabs from '../components/BookingTabs.jsx';
import Gallery from '../components/Gallery.jsx';
import Nav from '../components/Nav.jsx';
import Reviews from '../components/Reviews.jsx';
import site from '../lib/current-site.js';
import { loadPhotoData, loadReviewData, loadUnavailableDates } from '../lib/data.js';
import { buildFaqPage, buildVacationRental, jsonLd } from '../lib/structured-data.js';
import { BASE_PATH, sitePath, siteSrcSet } from '../lib/site-urls.js';

// Booking tab content from the site config: a string is a paragraph, { strong } a bold paragraph,
// and { list } a bulleted list.
function ContentBlocks({ blocks }) {
    return blocks.map((block, index) => {
        if (typeof block === 'string') return <p key={index}>{block}</p>;
        if (block.strong) return <p key={index}><strong>{block.strong}</strong></p>;
        if (block.list) return <ul key={index}>{block.list.map(item => <li key={item}>{item}</li>)}</ul>;
        return null;
    });
}

function formatRating(rating) {
    return Number.isInteger(rating) ? rating.toFixed(1) : rating.toFixed(2);
}

// Visible overall Airbnb rating. Google requires any rating in structured data to be shown on the page.
function ReviewSummary({ reviewData }) {
    const rating = Number(reviewData.rating);
    const count = Number(reviewData.count);
    if (!Number.isFinite(rating) || !Number.isFinite(count) || count < 1) {
        return null;
    }

    return (
        <p className="review-summary">
            <span aria-hidden="true">★</span>{' '}
            <a href={`https://www.airbnb.com/rooms/${site.airbnb.listingId}`} target="_blank" rel="noopener noreferrer">
                {`Rated ${formatRating(rating)} out of 5 from ${count} Airbnb ${count === 1 ? 'review' : 'reviews'}`}
            </a>
        </p>
    );
}

function LocationMap({ location, address }) {
    const destination = location.mapDestination;
    if (!destination || !address.street) {
        return null;
    }

    const origin = `${address.street}, ${address.city} ${address.region}`;
    const originWithPostalCode = [origin, address.postalCode].filter(Boolean).join(' ');

    return (
        <details className="location-map">
            <summary>View map</summary>
            <iframe
                src={`https://www.google.com/maps?output=embed&saddr=${encodeURIComponent(origin)}&daddr=${encodeURIComponent(destination.query)}`}
                title={`Map from ${originWithPostalCode} to ${destination.name}`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
            <a
                className="location-map-directions"
                href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originWithPostalCode)}&destination=${encodeURIComponent(destination.query)}`}
                target="_blank"
                rel="noopener noreferrer"
            >
                Open directions in Google Maps
            </a>
        </details>
    );
}

export default function HomePage() {
    const { photos } = loadPhotoData();
    const reviewData = loadReviewData();
    const unavailableDates = loadUnavailableDates();
    const { address, coordinates, links, booking } = site;
    // Sections a new listing may not have yet: reviews (none on Airbnb) and availability (calendar
    // feeds not set up). They're left out, along with their links, until the data exists.
    const hasReviews = reviewData.count > 0 || reviewData.reviews.length > 0;
    const hasCalendar = unavailableDates !== null;
    const hasContact = Boolean(links.email || address.street);

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: jsonLd(buildVacationRental(site, { photos, reviewData })) }}
            />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(buildFaqPage(site.faq.items)) }} />

            <Nav
                siteName={site.name}
                logo={sitePath(site.images.logo)}
                instagram={links.instagram}
                instagramIcon={sitePath('/images/instagram-icon.png')}
                showReviews={hasReviews}
                showAvailability={hasCalendar}
            />

            <section className="hero">
                {/* The 4:3 photo covers the full screen, so on tall screens it's drawn 4/3 of the screen
                    height wide; sizes accounts for that so phones don't get a blurry version. */}
                <img
                    src={sitePath(site.images.hero.src)}
                    srcSet={siteSrcSet(site.images.hero.srcSet)}
                    sizes="max(100vw, 133vh)"
                    fetchPriority="high"
                    alt={site.images.hero.alt}
                    className="hero-image"
                />
                <div className="hero-overlay"></div>
                <div className="hero-content">
                    <div className="hero-subtitle">{site.hero.subtitle}</div>
                    <h1>{site.hero.heading}</h1>
                    <p className="hero-description">{site.hero.description}</p>
                    <a href={hasCalendar ? '#availability' : '#book-now'} className="hero-cta">{site.hero.cta}</a>
                </div>
            </section>

            <div className="stats" style={{ '--stat-columns': site.stats.length }}>
                {site.stats.map(stat => (
                    <div className="stat" key={stat.label}>
                        <div className="stat-number">{stat.value}</div>
                        <div className="stat-label">{stat.label}</div>
                    </div>
                ))}
            </div>

            <section className="section">
                <div className="section-header">
                    <div className="section-tag">{site.features.tag}</div>
                    <h2 className="section-title">{site.features.title}</h2>
                    <p className="section-description">{site.features.description}</p>
                </div>
                <div className="features-grid">
                    {site.features.items.map(feature => (
                        <div className="feature" key={feature.title}>
                            <div className="feature-icon">{feature.icon}</div>
                            <h3>{feature.title}</h3>
                            <p>{feature.text}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="section" id="gallery">
                <div className="section-header">
                    <div className="section-tag">Gallery</div>
                    <h2 className="section-title">{site.gallery.title}</h2>
                </div>
                <div id="photo-gallery">
                    <Gallery photos={photos} siteName={site.name} basePath={BASE_PATH} />
                </div>
            </section>

            <section className="section amenities" id="amenities">
                <div className="section-header">
                    <div className="section-tag">Amenities</div>
                    <h2 className="section-title">{site.amenities.title}</h2>
                    <p className="section-description">{site.amenities.description}</p>
                </div>
                <div className="amenities-grid">
                    {site.amenities.categories.map(category => (
                        <div className="amenity-category" key={category.title}>
                            <h3>
                                <span className="amenity-category-icon" aria-hidden="true">{category.icon}</span>
                                {category.title}
                            </h3>
                            <ul className="amenity-list">
                                {category.items.map(([icon, text]) => (
                                    <li key={text}>
                                        <span className="amenity-item-icon" aria-hidden="true">{icon}</span>
                                        <span>{text}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="highlight-section">
                    <div className="highlight-image">
                        <img
                            src={sitePath(site.location.image.src)}
                            width={site.location.image.width}
                            height={site.location.image.height}
                            loading="lazy"
                            decoding="async"
                            alt={site.location.image.alt}
                        />
                    </div>
                    <div className="highlight-content">
                        <div className="section-tag">Location</div>
                        <h2 className="section-title">{site.location.title}</h2>
                        {site.location.highlight && <p><strong>{site.location.highlight}</strong></p>}
                        <p>{site.location.text}</p>
                        <LocationMap location={site.location} address={address} />
                    </div>
                </div>
            </section>

            {hasReviews && (
            <section className="reviews-section" id="reviews">
                <div className="section-header">
                    <div className="section-tag">Guest Reviews</div>
                    <h2 className="section-title">{site.reviews.title}</h2>
                    <p className="section-description">{site.reviews.description}</p>
                    <ReviewSummary reviewData={reviewData} />
                </div>
                {reviewData.reviews.length > 0 && (
                    <div id="reviews-carousel" aria-live="polite">
                        <Reviews reviews={reviewData.reviews} />
                    </div>
                )}
            </section>
            )}

            {hasCalendar && (
            <section className="availability-section-wrap" id="availability">
                <div className="availability-section">
                    <div className="section-header">
                        <div className="section-tag">Availability</div>
                        <h2 className="section-title">Current Availability</h2>
                    </div>
                    <div id="availability-calendar" className="availability-calendar">
                        <AvailabilityCalendar unavailableDates={unavailableDates} />
                    </div>
                </div>
            </section>
            )}

            <section className="cta-section" id="book-now">
                <h2 className="section-title">Book Now</h2>
                {booking.direct && (
                    <div className="booking-details">
                        <h3 className="booking-details-title">{booking.direct.title}</h3>
                        <a href={booking.direct.url} target="_blank" rel="noopener noreferrer" className="cta-button">
                            Book Direct
                        </a>
                        <BookingTabs
                            tabs={booking.direct.tabs.map(tab => ({
                                id: tab.id,
                                label: tab.label,
                                content: <ContentBlocks blocks={tab.content} />
                            }))}
                        />
                    </div>
                )}
                <div className="platform-booking">
                    <h3>Book Through Platforms</h3>
                    <p>{booking.platformText}</p>
                    <div className="platform-booking-actions">
                        <a href={site.airbnb.bookingUrl} target="_blank" rel="noopener noreferrer" className="cta-button">
                            Book on Airbnb
                        </a>
                        {links.vrbo && (
                            <a href={links.vrbo} target="_blank" rel="noopener noreferrer" className="cta-button">
                                Book on VRBO
                            </a>
                        )}
                    </div>
                </div>
            </section>

            <section className="section" id="faq">
                <div className="section-header">
                    <div className="section-tag">Frequently Asked Questions</div>
                    <h2 className="section-title">{site.faq.title}</h2>
                </div>
                <div className="booking-details faq-details">
                    <h3 className="booking-details-title">{site.faq.heading}</h3>
                    {site.faq.items.map(({ question, answer }) => (
                        <Fragment key={question}>
                            <h3>{question}</h3>
                            <p>{answer}</p>
                        </Fragment>
                    ))}
                </div>
            </section>

            <footer>
                <div className="footer-grid">
                    <div className="footer-brand">
                        <h3>{site.name}</h3>
                        <p>{site.footer.description}</p>
                    </div>
                    <div className="footer-section">
                        <h4>Quick Links</h4>
                        <ul className="footer-links">
                            <li><a href="#gallery">Gallery</a></li>
                            <li><a href="#amenities">Amenities</a></li>
                            {hasReviews && <li><a href="#reviews">Reviews</a></li>}
                            {hasCalendar && <li><a href="#availability">Availability</a></li>}
                            {links.instagram && (
                                <li>
                                    <a href={links.instagram} aria-label={`${site.name} on Instagram`}>
                                        <img src={sitePath('/images/instagram-icon.png')} alt="" className="icon" />
                                    </a>
                                </li>
                            )}
                        </ul>
                    </div>
                    {hasContact && (
                    <div className="footer-section">
                        <h4>Contact</h4>
                        <ul className="footer-links">
                            {links.email && <li><a href={`mailto:${links.email}`}>Email Us</a></li>}
                            {address.street && (
                                <li>
                                    <address className="footer-address">
                                        <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${coordinates.latitude}%2C${coordinates.longitude}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            {address.street}<br />
                                            {`${address.city}, ${address.region}${address.postalCode ? ` ${address.postalCode}` : ''}`}
                                        </a>
                                    </address>
                                </li>
                            )}
                        </ul>
                    </div>
                    )}
                </div>
                <div className="footer-bottom">
                    {/* The site rebuilds whenever its data changes (at least monthly), so the build year stays current. */}
                    <p>&copy; {new Date().getFullYear()} {site.company}. All rights reserved.</p>
                    {links.github && (
                        <p><a href={links.github} target="_blank" rel="noopener noreferrer">GitHub Repo</a></p>
                    )}
                </div>
            </footer>
        </>
    );
}
