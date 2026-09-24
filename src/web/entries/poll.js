// Entry for the /poll Splunk view — full admin console.
// Dynamic import so that the root, its dependencies, and all four
// lazy-loaded admin pages live in async chunks that webpack can dedupe
// against the sibling /play and /projector entries.
import('../roots/FullRoot').then((m) => m.default());
