import site from '../lib/current-site.js';

export const dynamic = 'force-static';

// All crawlers, including search engines and AI assistants, may crawl the whole site.
export default function robots() {
    return {
        rules: { userAgent: '*', allow: '/' },
        sitemap: new URL('sitemap.xml', site.url).href
    };
}
