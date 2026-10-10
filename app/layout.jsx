import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Cormorant_Garamond, Manrope } from 'next/font/google';
import site, { SITE_ID } from '../lib/current-site.js';
import { absoluteUrl, sitePath } from '../lib/site-urls.js';
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

// "/images/favicon/favicon.svg" -> "/images/favicon/favicon.svg?v=1a2b3c4d", from the file's contents.
// Browsers keep favicons long after a hard refresh, so a changed icon needs a new URL to show up.
function iconPath(path) {
    try {
        const hash = createHash('sha256').update(readFileSync(join(process.cwd(), 'sites', SITE_ID, 'public', path)));
        return `${sitePath(path)}?v=${hash.digest('hex').slice(0, 8)}`;
    } catch {
        return sitePath(path);
    }
}
// Absolute URLs, so they're right whether the site is at a domain's root or in a subfolder.
const shareImage = absoluteUrl(site.images.share);

export const metadata = {
    metadataBase: new URL(site.url),
    title: site.seo.title,
    description: site.seo.description,
    alternates: { canonical: site.url },
    robots: { index: true, follow: true },
    openGraph: {
        type: 'website',
        title: site.seo.title,
        description: site.seo.description,
        url: site.url,
        siteName: site.name,
        images: [{ url: shareImage, alt: site.seo.shareImageAlt }]
    },
    twitter: {
        card: 'summary_large_image',
        title: site.seo.title,
        description: site.seo.description,
        images: [shareImage]
    },
    icons: {
        icon: [
            { url: iconPath(favicon.svg), type: 'image/svg+xml' },
            favicon.png32 && { url: iconPath(favicon.png32), sizes: '32x32', type: 'image/png' },
            favicon.png16 && { url: iconPath(favicon.png16), sizes: '16x16', type: 'image/png' }
        ].filter(Boolean),
        ...(favicon.ico && { shortcut: iconPath(favicon.ico) }),
        ...(favicon.appleTouch && { apple: { url: iconPath(favicon.appleTouch), sizes: '180x180' } })
    },
    ...(favicon.manifest && { manifest: iconPath(favicon.manifest) })
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
