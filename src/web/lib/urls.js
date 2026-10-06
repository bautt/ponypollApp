/**
 * Same-origin URL helpers derived from the current page location.
 *
 * Routing in this app is pathname-based rather than via a router (see
 * App.jsx), so the participant/projector views live as sibling paths next
 * to whichever admin view is currently loaded (e.g. `/poll` -> `/play`,
 * `/poll` -> `/projector`). Centralised here so AdminPage and the top nav
 * bar derive identical URLs.
 */

/** Infer the locale prefix from the current page URL (e.g. "/en-US"). */
export function localePrefix() {
    const parts = window.location.pathname.split('/');
    if (parts.length >= 2 && /^[a-z]{2}(-[A-Z]{2})?$/.test(parts[1])) {
        return '/' + parts[1];
    }
    return '/en-US';
}

/** Build the participant "play" URL from the current page location. */
export function getPlayUrl() {
    const { protocol, host, pathname } = window.location;
    const base = pathname.replace(/\/[^/]+(\?.*)?$/, '');
    return `${protocol}//${host}${base}/play`;
}

/** Build the read-only "projector" (wall-screen) URL from the current page location. */
export function getProjectorUrl() {
    const { protocol, host, pathname } = window.location;
    const base = pathname.replace(/\/[^/]+(\?.*)?$/, '');
    return `${protocol}//${host}${base}/projector`;
}

/** Build a same-origin URL to a view in this app (classic XML or Studio). */
export function getAppViewUrl(view) {
    const { protocol, host } = window.location;
    return `${protocol}//${host}${localePrefix()}/app/ponypollapp/${view}`;
}

/** Build a same-origin link back to Splunk's own app home/launcher, honoring locale. */
export function getSplunkHomeUrl() {
    return `${localePrefix()}/app/launcher/home`;
}
