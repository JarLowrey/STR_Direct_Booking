'use client';

import { useEffect, useState } from 'react';

// Fixed top navigation: shrinks once the page scrolls, and collapses into a menu on phones.
export default function Nav({ siteName, logo, instagram }) {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const onScroll = () => setIsScrolled(window.scrollY > 100);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // Close the phone menu after following a link.
    const closeMenu = () => setIsOpen(false);

    return (
        <nav id="nav" className={isScrolled ? 'scrolled' : undefined}>
            <a className="logo" href="#top" aria-label={`Return to the top of ${siteName}`}>
                <img className="logo-icon" src={logo} alt={`${siteName} icon`} />
                <span className="logo-text">{siteName}</span>
            </a>
            <button
                className="mobile-nav-toggle"
                type="button"
                aria-expanded={isOpen}
                aria-controls="primary-navigation"
                aria-label={isOpen ? 'Close navigation' : 'Open navigation'}
                onClick={() => setIsOpen(open => !open)}
            >
                &#9776;
            </button>
            <div className={`nav-links${isOpen ? ' is-open' : ''}`} id="primary-navigation" onClick={event => {
                if (event.target.closest('a')) closeMenu();
            }}>
                <a href="#gallery">Gallery</a>
                <a href="#amenities">Amenities</a>
                <a href="#reviews">Reviews</a>
                <a href="#availability" className="availability-nav-link" aria-label="Check availability"
                    title="Check availability">&#128197;</a>
                {instagram && (
                    <a href={instagram} aria-label={`${siteName} on Instagram`}>
                        <img src="/images/instagram-icon.png" alt="" className="icon" />
                    </a>
                )}
                <a href="#book-now" className="nav-cta">Book Now</a>
            </div>
        </nav>
    );
}
