// URLs for the current site. A site can live at the root of its own domain
// (https://rainier-getaway.com/) or in a subfolder of a GitHub Pages address
// (https://jarlowrey.github.io/RainierTinyHome/); its config's `url` decides which, and next.config.mjs
// sets the matching basePath. Paths in site configs are written from the site root ("/images/hero.jpg"),
// so anything that isn't a Next.js link or asset goes through these helpers.

import site from './current-site.js';

// "" for a site at the root of its domain, or "/RainierTinyHome" for one in a subfolder.
export const BASE_PATH = new URL(site.url).pathname.replace(/\/$/, '');

// "/images/hero.jpg" -> "/RainierTinyHome/images/hero.jpg" (unchanged for a root site).
export function sitePath(path) {
    return typeof path === 'string' && path.startsWith('/') ? `${BASE_PATH}${path}` : path;
}

// Applies sitePath to every URL in an <img srcset> value.
export function siteSrcSet(srcSet) {
    return srcSet
        ?.split(',')
        .map(entry => {
            const [url, ...descriptor] = entry.trim().split(/\s+/);
            return [sitePath(url), ...descriptor].join(' ');
        })
        .join(', ');
}

// "/images/hero.jpg" -> "https://jarlowrey.github.io/RainierTinyHome/images/hero.jpg"
export function absoluteUrl(path) {
    return new URL(String(path).replace(/^\//, ''), site.url).href;
}
