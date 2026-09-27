/** @type {import('next').NextConfig} */
const nextConfig = {
    // Static site generation: `next build` writes plain HTML, CSS, and JS to out/, which GitHub
    // Pages serves as-is (see .github/workflows/deploy.yml).
    output: 'export',
    // Photos are resized by the image workflow (see scripts/fetch-airbnb-images.mjs), and a static
    // export has no server to optimize images on request.
    images: { unoptimized: true }
};

export default nextConfig;
