// Entry for the /play Splunk view — participant-only, no admin chrome.
// Dynamic import lets webpack extract shared code (React, styled-components,
// lib/, components/, PollPage) into a chunk reusable by the /poll entry.
import('../roots/PlayRoot').then((m) => m.default());
