// Runs Next.js for one listing site:
//
//   npm run dev -- <site>       development server with live reload
//   npm run build -- <site>     static build in out/
//   npm run preview             serves out/ (whatever site was built last)
//
// The site name can be left out while there's only one site under sites/.

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { prepareSite, resolveSiteId, ROOT } from './sites.mjs';

const [command, requestedSite] = process.argv.slice(2);
const run = (executable, args) => new Promise((resolvePromise, reject) => {
    const child = spawn(executable, args, { cwd: ROOT, stdio: 'inherit', shell: executable === 'npx' });
    child.on('error', reject);
    child.on('exit', code => (code === 0 ? resolvePromise() : reject(new Error(`${executable} exited with ${code}`))));
});

try {
    if (command === 'preview') {
        await run('npx', ['--yes', 'serve@14', 'out']);
    } else if (command === 'dev' || command === 'build') {
        const siteId = await resolveSiteId(requestedSite);
        await prepareSite(siteId);
        console.log(`Site: ${siteId}`);
        const nextCli = createRequire(import.meta.url).resolve('next/dist/bin/next');
        await run(process.execPath, [nextCli, command]);
    } else {
        console.error('Usage: node scripts/site.mjs <dev | build | preview> [site]');
        process.exit(1);
    }
} catch (error) {
    console.error(error.message);
    process.exit(1);
}
