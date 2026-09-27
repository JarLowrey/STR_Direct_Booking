import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
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
});
