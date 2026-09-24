// Entry for the /projector Splunk view — read-only wall-screen view.
// Dynamic import mirrors the poll/play entries so webpack can dedupe
// shared code (React, styled-components, lib/theme, lib/kvstore) across
// all three roots.
import('../roots/ProjectorRoot').then((m) => m.default());
