import { useEffect, useState } from 'react';

// A 1-based page number from the URL (?reviews=2) as a 0-based page index, or null if it's missing or not a page.
export function pageIndexParam(params, name) {
    const value = params.get(name);
    return value !== null && /^[1-9]\d*$/.test(value) ? Number(value) - 1 : null;
}

// Keeps some of a component's state in the page's URL parameters (like ?reviews=2&room=Kitchen) so a link opens the
// page as it was being viewed. The build can't know the URL, so after load restore(params) applies the URL's values
// once; from then on, the URL follows params, where a null value removes that parameter. Parameters other components
// use are left alone. replaceState rather than pushState, so paging through photos doesn't fill the Back button.
export function useUrlParams(restore, params) {
    const [restored, setRestored] = useState(false);

    useEffect(() => {
        restore(new URLSearchParams(window.location.search));
        setRestored(true);
    }, []);

    const paramsKey = JSON.stringify(params);
    useEffect(() => {
        if (!restored) {
            return;
        }

        const url = new URL(window.location.href);
        for (const [name, value] of Object.entries(params)) {
            if (value === null || value === undefined) {
                url.searchParams.delete(name);
            } else {
                url.searchParams.set(name, String(value));
            }
        }
        if (url.href !== window.location.href) {
            window.history.replaceState(null, '', url);
        }
    }, [restored, paramsKey]);
}
