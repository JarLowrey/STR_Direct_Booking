import site from './lib/current-site.js';

// A site whose url has a path (a GitHub Pages project address like https://owner.github.io/Repo/)
// is served from that subfolder; one on its own domain is served from the root.
const basePath = new URL(site.url).pathname.replace(/\/$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
    // Static site generation: `next build` writes plain HTML, CSS, and JS to out/, which GitHub
    // Pages serves as-is (see .github/workflows/deploy.yml).
    output: 'export',
    ...(basePath && { basePath }),
    // Photos are resized by the image workflow (see scripts/fetch-airbnb-images.mjs), and a static
    // export has no server to optimize images on request.
    images: { unoptimized: true }
};

export default nextConfig;
