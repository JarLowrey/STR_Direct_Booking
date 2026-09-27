// Finds the listing sites under sites/ and prepares one for building.
//
// Each site is a folder sites/<id>/ with:
//   site.config.js   the listing's text, links, Airbnb ID, and deploy target
//   data/            reviews.json and combined_calendar.ics (kept current by the workflows)
//   public/          files served as-is: images, CNAME, llms.txt
//
// Next.js serves one public/ folder and the app imports one config, so before each build or dev
// server run, prepareSite() copies shared/public/ and sites/<id>/public/ into public/ and writes
// lib/current-site.js pointing at that site's config. Both are generated and gitignored.
//
// From the command line, `node scripts/sites.mjs matrix [site]` prints the sites (or just one) as
// JSON for GitHub Actions job matrices.

import { access, cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const SITES_DIR = join(ROOT, 'sites');
export const SHARED_PUBLIC_DIR = join(ROOT, 'shared', 'public');
export const PUBLIC_DIR = join(ROOT, 'public');
export const CURRENT_SITE_MODULE = join(ROOT, 'lib', 'current-site.js');

const SITE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function listSiteIds() {
    const entries = await readdir(SITES_DIR, { withFileTypes: true }).catch(() => []);
    const ids = [];
    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        try {
            await access(join(SITES_DIR, entry.name, 'site.config.js'));
            ids.push(entry.name);
        } catch {
            // Not a site folder.
        }
    }
    return ids.sort();
}

export function sitePaths(id) {
    const dir = join(SITES_DIR, id);
    return {
        dir,
        config: join(dir, 'site.config.js'),
        dataDir: join(dir, 'data'),
        publicDir: join(dir, 'public'),
        reviews: join(dir, 'data', 'reviews.json'),
        calendar: join(dir, 'data', 'combined_calendar.ics'),
        photos: join(dir, 'public', 'images', 'airbnb_images'),
        thumbnails: join(dir, 'public', 'images', 'airbnb_thumbnails')
    };
}

export async function loadSiteConfig(id) {
    const { default: config } = await import(pathToFileURL(sitePaths(id).config).href);
    return config;
}

// The site to use: the one requested (argument or SITE environment variable), or the only site
// if there's just one.
export async function resolveSiteId(requested = process.env.SITE) {
    const ids = await listSiteIds();
    if (requested) {
        if (!ids.includes(requested)) {
            throw new Error(`Unknown site "${requested}". Sites: ${ids.join(', ') || '(none)'}`);
        }
        return requested;
    }
    if (ids.length === 1) {
        return ids[0];
    }
    throw new Error(`Choose a site (${ids.join(', ')}), for example: npm run dev -- ${ids[0] ?? '<site>'}`);
}

// Checks the fields the shared code depends on, so a mistake in a new listing's config fails
// with a clear message instead of a broken page.
export function validateSiteConfig(id, config) {
    const problems = [];
    if (!SITE_ID_PATTERN.test(id)) problems.push('folder name must be lowercase words joined by hyphens');

    const required = [
        'name', 'company', 'url', 'deploy.repository', 'airbnb.listingId', 'airbnb.bookingUrl', 'calendarSecret',
        'seo.title', 'seo.description', 'seo.structuredDescription', 'seo.identifier',
        'address.city', 'address.region', 'address.country', 'coordinates.latitude', 'coordinates.longitude',
        'property.maxGuests', 'property.bedrooms', 'property.beds', 'property.bathrooms',
        'images.hero.src', 'images.hero.alt', 'images.share', 'images.favicon.svg',
        'hero.heading', 'hero.description', 'features.items', 'amenities.categories',
        'location.title', 'location.image.src', 'reviews.title', 'faq.items', 'footer.description', 'notFound.heading'
    ];
    for (const path of required) {
        const value = path.split('.').reduce((object, key) => object?.[key], config);
        if (value === undefined || value === null || value === '') problems.push(`missing ${path}`);
    }

    if (config?.url && !/^https:\/\/[^/]+\/$/.test(config.url)) problems.push('url must look like https://example.com/');
    if (config?.deploy?.repository && !/^[\w.-]+\/[\w.-]+$/.test(config.deploy.repository)) {
        problems.push('deploy.repository must look like owner/repo');
    }
    if (config?.calendarSecret && !/^[A-Z][A-Z0-9_]*$/.test(config.calendarSecret)) {
        problems.push('calendarSecret must be an uppercase GitHub secret name like CALENDAR_FEEDS_MY_SITE');
    }

    if (problems.length) {
        throw new Error(`sites/${id}/site.config.js: ${problems.join('; ')}`);
    }
    return config;
}

// Makes public/ and lib/current-site.js match the given site.
export async function prepareSite(id) {
    const config = validateSiteConfig(id, await loadSiteConfig(id));
    const paths = sitePaths(id);

    await rm(PUBLIC_DIR, { recursive: true, force: true });
    await mkdir(PUBLIC_DIR, { recursive: true });
    await cp(SHARED_PUBLIC_DIR, PUBLIC_DIR, { recursive: true }).catch(error => {
        if (error.code !== 'ENOENT') throw error;
    });
    // Site files win over shared ones with the same name.
    await cp(paths.publicDir, PUBLIC_DIR, { recursive: true, force: true });
    // Tells GitHub Pages to serve the files as-is. Without it, Pages runs Jekyll, which skips
    // folders starting with "_" such as Next.js's _next/.
    await writeFile(join(PUBLIC_DIR, '.nojekyll'), '');

    await writeFile(CURRENT_SITE_MODULE, [
        '// Generated by scripts/sites.mjs for the site being built or served. Do not edit or commit.',
        `export { default } from '../sites/${id}/site.config.js';`,
        `export const SITE_ID = '${id}';`,
        ''
    ].join('\n'));

    return config;
}

// One entry per site for GitHub Actions matrices.
export async function siteMatrix() {
    const sites = [];
    for (const id of await listSiteIds()) {
        const config = validateSiteConfig(id, await loadSiteConfig(id));
        sites.push({ id, repository: config.deploy.repository, calendarSecret: config.calendarSecret });
    }
    return sites;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const [command, id] = process.argv.slice(2);
    if (command === 'matrix') {
        // An optional site name limits the matrix to that site.
        const sites = await siteMatrix();
        if (id && !sites.some(site => site.id === id)) {
            throw new Error(`Unknown site "${id}". Sites: ${sites.map(site => site.id).join(', ')}`);
        }
        console.log(JSON.stringify(id ? sites.filter(site => site.id === id) : sites));
    } else if (command === 'prepare') {
        const siteId = await resolveSiteId(id);
        await prepareSite(siteId);
        console.log(`Prepared ${siteId}`);
    } else {
        console.error('Usage: node scripts/sites.mjs <matrix | prepare [site]>');
        process.exit(1);
    }
}
