import { Cormorant_Garamond, Manrope } from 'next/font/google';
import site from '../lib/current-site.js';
import './globals.css';

// Downloaded at build time and served from this site, so there's no render-blocking request to
// Google Fonts. globals.css uses them through these CSS variables.
const displayFont = Cormorant_Garamond({
    subsets: ['latin'],
    weight: ['300', '400', '500', '600', '700'],
    variable: '--font-display',
    display: 'swap'
});

const bodyFont = Manrope({
    subsets: ['latin'],
    weight: ['300', '400', '500', '600', '700'],
    variable: '--font-body',
    display: 'swap'
});

const { favicon } = site.images;

export const metadata = {
    metadataBase: new URL(site.url),
    title: site.seo.title,
    description: site.seo.description,
    alternates: { canonical: '/' },
    robots: { index: true, follow: true },
    openGraph: {
        type: 'website',
        title: site.seo.title,
        description: site.seo.description,
        url: '/',
        siteName: site.name,
        images: [{ url: site.images.share, alt: site.seo.shareImageAlt }]
    },
    twitter: {
        card: 'summary_large_image',
        title: site.seo.title,
        description: site.seo.description,
        images: [site.images.share]
    },
    icons: {
        icon: [
            { url: favicon.svg, type: 'image/svg+xml' },
            favicon.png32 && { url: favicon.png32, sizes: '32x32', type: 'image/png' },
            favicon.png16 && { url: favicon.png16, sizes: '16x16', type: 'image/png' }
        ].filter(Boolean),
        ...(favicon.ico && { shortcut: favicon.ico }),
        ...(favicon.appleTouch && { apple: { url: favicon.appleTouch, sizes: '180x180' } })
    },
    ...(favicon.manifest && { manifest: favicon.manifest })
};

export const viewport = {
    themeColor: '#1a1a1a'
};

export default function RootLayout({ children }) {
    return (
        <html lang="en" className={`${displayFont.variable} ${bodyFont.variable}`}>
            <body id="top">{children}</body>
        </html>
    );
}
