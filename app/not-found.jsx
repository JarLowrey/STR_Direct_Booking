import site from '../lib/current-site.js';

// Exported as 404.html, which GitHub Pages shows for any missing URL.
export const metadata = {
    title: `Page Not Found | ${site.name}`,
    // Overrides the site-wide "index, follow" so the page doesn't carry two conflicting robots tags.
    robots: { index: false, follow: true }
};

export default function NotFound() {
    return (
        <main
            className="not-found"
            style={site.images.notFoundBackground ? { backgroundImage: `url('${site.images.notFoundBackground}')` } : undefined}
        >
            <div className="not-found-card">
                <div className="section-tag">Page not found</div>
                <h1>{site.notFound.heading}</h1>
                <p>{site.notFound.text}</p>
                <a href="/" className="hero-cta">{site.notFound.cta}</a>
            </div>
        </main>
    );
}
