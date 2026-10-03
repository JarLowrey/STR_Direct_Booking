# Rental Listing Sites

Websites for vacation rental listings: [Rainier Getaway](https://rainier-getaway.com/),
[Cozy Rainier Cabin](https://jarlowrey.github.io/RainierTinyHome/), and
[Seattle Tulip Hideaway](https://jarlowrey.github.io/SeattleTulipHideaway/). One
[Next.js](https://nextjs.org/) codebase builds a static site for each listing in `sites/`, and each site deploys
to its own GitHub Pages repository and domain.

Each site includes:

- A photo gallery with room filters and full-size pop-ups
- Amenities, location, FAQ, and booking terms
- Airbnb guest reviews and the overall Airbnb rating
- An availability calendar built from the combined Airbnb and VRBO calendars
- Structured data, a sitemap, and `robots.txt`, all generated from the same data as the page

Photos, reviews, and availability stay current automatically: scheduled workflows pull them from Airbnb and VRBO,
commit them, and redeploy the affected site.

## Requirements

- Node.js 24 or newer, and npm

## Install

```powershell
npm.cmd install
```

PowerShell may block the `npm.ps1` script because of its execution policy. Use `npm.cmd` as shown.

## Develop

```powershell
npm.cmd run dev -- rainier-getaway
```

Open http://localhost:3000/. Pages reload as you edit `app/`, `components/`, `lib/`, or the site's `site.config.js`.
Files in a site's `public/` folder are copied when the server starts, so restart it after changing those. The site
name can be left out while `sites/` has only one site.

## Build and Preview

```powershell
npm.cmd run build -- rainier-getaway
npm.cmd run preview
```

`build` writes the finished static site to `out/`, and `preview` serves it at http://localhost:3000/ so you can
check exactly what will be deployed.

## Run Tests

```powershell
npm.cmd test
```

The tests check every site folder for a complete config and the files its pages need, and cover calendar parsing
and merging, structured data, and both Airbnb scrapers.

## How It Fits Together

```text
sites/<site>/site.config.js   Everything specific to one listing: text, house rules, links, Airbnb ID, deploy target
sites/<site>/data/            reviews.json and combined_calendar.ics (updated by workflows)
sites/<site>/public/          Files served as-is: hero and other images, favicon, listing photos, CNAME, llms.txt
shared/public/                Files every site uses (such as the Instagram icon)
app/, components/, lib/       The shared site code; nothing in it mentions a particular listing
scripts/                      Site tooling, Airbnb scrapers, and the calendar merger
.github/workflows/            Deploys and scheduled data updates
```

Before building or serving, `scripts/sites.mjs` copies `shared/public/` and the site's `public/` into `public/`
and writes `lib/current-site.js`, which points the app at the site's config. Both are generated and gitignored.

At build time the homepage reads the site's reviews, calendar, and photo list and renders everything into static
HTML, so search engines and AI crawlers that don't run JavaScript still see it all. The availability calendar's
booked dates come from the build; the calendar itself is drawn in the browser because it starts from today's date.

## Deployment

`.github/workflows/deploy.yml` runs the tests and builds every site for each pull request. On every push to
`main` it also publishes each site's build to the `gh-pages` branch of the repository named in the site's
`deploy.repository`, replacing that branch with a single commit.

For each deploy repository, in **Settings > Pages**:

- **Source**: Deploy from a branch
- **Branch**: `gh-pages`, folder `/ (root)`
- **Custom domain**: the site's domain (it's also in the site's `public/CNAME`)

Publishing to this repository uses the workflow's own token. Publishing to any other repository needs a
fine-grained personal access token with **Contents: Read and write** on those repositories, saved in this
repository as the `PAGES_DEPLOY_TOKEN` Actions secret.

## Data Updates

These workflows run for every site, one site at a time. Each commits only when that site's data changed, then starts
the deploy workflow for that site (commits pushed by a workflow don't trigger other workflows on their own). All can
also be started manually from the Actions tab.

- `update-calendars.yml` runs every 2 hours. It downloads the site's Airbnb and VRBO calendar feeds, removes bookings
  listed on both, and writes `sites/<site>/data/combined_calendar.ics`. It fails without writing anything if a feed
  returns something other than a calendar.
- `update-reviews.yml` runs monthly on the 1st. It collects the listing's Airbnb reviews and writes
  `sites/<site>/data/reviews.json`: the overall rating and count, and every review with its rating, all shown on the
  site.
- `update-airbnb-images.yml` runs monthly on the 1st. It reads the photo-tour data Airbnb embeds in the listing page
  (plain HTTP first, falling back to headless Chromium if that's blocked) and downloads every photo in gallery order,
  waiting 0.5-1.25 seconds between downloads. It writes full-size photos and a `metadata.json` (order, room,
  description) to `sites/<site>/public/images/airbnb_images/` and 480px and 800px WebP thumbnails to
  `sites/<site>/public/images/airbnb_thumbnails/`. Downloads are retried, and files are staged so a failed run
  never leaves a folder half-replaced.

Each site's calendar feed URLs contain private access tokens, so they're stored as a GitHub Actions secret (named in
the site's `calendarSecret`) holding a JSON array:

```json
[
  { "label": "Airbnb", "url": "https://www.airbnb.com/calendar/ical/....ics?t=..." },
  { "label": "VRBO", "url": "https://www.vrbo.com/icalendar/....ics?nonTentative" }
]
```

## Adding a Listing

1. Copy `sites/rainier-getaway/` to `sites/<new-site>/` (lowercase words joined by hyphens).
2. In `sites/<new-site>/site.config.js`, update everything: name, company, `url`, `deploy.repository`,
   `airbnb.listingId` (the number in the listing's `airbnb.com/rooms/...` URL) and booking link, `calendarSecret`,
   address, coordinates, property details, and all the page text. Optional parts (VRBO, Instagram, and email links,
   the street address, the direct-booking section, the location map) can be removed. If the city requires a rental
   license number on every listing (Seattle does), set `license` to the text to show in the footer.
   - With a custom domain, set `url` to `https://your-domain.com/`.
   - Without one, set `url` to the deploy repository's Pages address, `https://<owner>.github.io/<repo>/`. The site
     is built to live in that subfolder. (Search engines only read `robots.txt` at a domain's root, so a subfolder
     site's `robots.txt` is ignored; its sitemap still works.)
3. In `sites/<new-site>/public/`: replace the hero, location, and favicon images; set `CNAME` to the domain (delete
   it if there's no custom domain); update `llms.txt`; and delete the copied `images/airbnb_images/` and
   `images/airbnb_thumbnails/` folders.
4. In `sites/<new-site>/data/`, delete the copied files.
5. Fill in the listing's photos and reviews (a listing with no reviews yet gets an empty `reviews.json`, and the site
   leaves reviews out until it has some):

   ```powershell
   npx.cmd playwright install chromium
   node scripts/fetch-airbnb-images.mjs <new-site>
   node scripts/fetch-airbnb-reviews.mjs <new-site>
   ```

6. Optionally add availability. Without a calendar file, the site leaves the availability calendar out and the
   calendar workflow skips the site. To add it, put the listing's calendar feeds in the GitHub secret named in
   `calendarSecret` (see Data Updates), then run **Update Combined Calendar** from the Actions tab, or locally:

   ```powershell
   $env:CALENDAR_FEEDS = '[{"label":"Airbnb","url":"https://..."}]'
   node scripts/update-calendar.mjs <new-site>
   ```

7. Check it: `npm.cmd test`, then `npm.cmd run dev -- <new-site>`.
8. Set up the deploy repository: set its Pages settings (see Deployment), add the custom domain and point its DNS
   at GitHub Pages if there is one, and make sure the `PAGES_DEPLOY_TOKEN` secret here can write to the repository.
9. Commit and push. The deploy workflow publishes the new site.
