import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { listSiteIds, loadSiteConfig, sitePaths, validateSiteConfig } from './sites.mjs';

const exists = path => access(path).then(() => true, () => false);

test('finds at least one site', async () => {
    assert.ok((await listSiteIds()).length > 0);
});

// Catches an incomplete listing folder before it deploys a broken site.
for (const id of await listSiteIds()) {
    test(`sites/${id} has a valid config and the files its pages use`, async () => {
        const config = validateSiteConfig(id, await loadSiteConfig(id));
        const paths = sitePaths(id);
        const publicFile = path => join(paths.publicDir, ...path.split('/').filter(Boolean));

        // The calendar is optional: a site without one leaves out availability until its feeds are set up.
        const required = [
            paths.reviews,
            join(paths.photos, 'metadata.json'),
            publicFile(config.images.hero.src),
            publicFile(config.images.share),
            publicFile(config.images.logo),
            publicFile(config.location.image.src),
            ...Object.values(config.images.favicon).map(publicFile)
        ];
        const missing = [];
        for (const path of required) {
            if (!(await exists(path))) missing.push(path);
        }
        assert.deepEqual(missing, [], `sites/${id} is missing files`);

        // Booking terms that show the deposit with {refundableDeposit} need it in data/pricing.json.
        if (JSON.stringify(config.booking).includes('{refundableDeposit}')) {
            const pricingPath = join(paths.dataDir, 'pricing.json');
            const pricing = (await exists(pricingPath)) ? JSON.parse(await readFile(pricingPath, 'utf8')) : {};
            assert.ok(
                Number.isFinite(pricing.refundableDeposit),
                `sites/${id} uses {refundableDeposit} but data/pricing.json has no refundableDeposit`
            );
        }
    });
}

test('rejects a config with missing or malformed fields', async () => {
    const config = await loadSiteConfig((await listSiteIds())[0]);

    assert.throws(() => validateSiteConfig('Bad Name', config), /lowercase words joined by hyphens/);
    assert.throws(() => validateSiteConfig('ok', { ...config, name: '' }), /missing name/);
    assert.throws(() => validateSiteConfig('ok', { ...config, url: 'https://example.com' }), /url must look like/);
    assert.throws(() => validateSiteConfig('ok', { ...config, url: 'https://owner.github.io/Repo' }), /url must look like/);
    assert.doesNotThrow(() => validateSiteConfig('ok', { ...config, url: 'https://owner.github.io/Repo/' }));
    assert.throws(() => validateSiteConfig('ok', { ...config, deploy: { repository: 'not a repo' } }), /owner\/repo/);
    assert.throws(() => validateSiteConfig('ok', { ...config, calendarSecret: 'lowercase' }), /uppercase GitHub secret/);
    assert.throws(() => validateSiteConfig('ok', { ...config, minNights: undefined }), /missing minNights/);
    // The old single-number form.
    assert.throws(() => validateSiteConfig('ok', { ...config, minNights: 2 }), /minNights.weekdays must give/);
    const weekdays = config.minNights.weekdays;
    const withMinNights = minNights => ({ ...config, minNights });
    assert.throws(() => validateSiteConfig('ok', withMinNights({ weekdays: { ...weekdays, thursday: undefined } })),
        /minNights.weekdays.thursday must be/);
    assert.throws(() => validateSiteConfig('ok', withMinNights({ weekdays: { ...weekdays, monday: 0 } })),
        /minNights.weekdays.monday must be/);
    assert.throws(() => validateSiteConfig('ok', withMinNights({ weekdays: { ...weekdays, Thursday: 3 } })),
        /Thursday is not a weekday/);
    assert.doesNotThrow(() => validateSiteConfig('ok', withMinNights({ weekdays })));
    assert.doesNotThrow(() => validateSiteConfig('ok', withMinNights({
        weekdays, specialDates: [{ date: '2026-12-24', minNights: 4 }]
    })));
    assert.throws(() => validateSiteConfig('ok', withMinNights({ weekdays, specialDates: { date: '2026-12-24' } })),
        /specialDates must be a list/);
    assert.throws(() => validateSiteConfig('ok', withMinNights({
        weekdays, specialDates: [{ date: '2026-02-30', minNights: 4 }]
    })), /invalid date "2026-02-30"/);
    assert.throws(() => validateSiteConfig('ok', withMinNights({
        weekdays, specialDates: [{ date: '2026-12-24', minNights: '4' }]
    })), /2026-12-24 minNights must be/);
    assert.throws(() => validateSiteConfig('ok', withMinNights({
        weekdays, specialDates: [{ date: '2026-12-24', minNights: 4 }, { date: '2026-12-24', minNights: 5 }]
    })), /lists 2026-12-24 more than once/);
});
