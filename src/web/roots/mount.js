import React from 'react';
import ReactDOM from 'react-dom';

/**
 * Create the app's root DOM element and render a React tree into it.
 * Splunk's `pages/splunk_ui_app.html` template ships an empty `<body>`,
 * so each entry (poll/play/projector) is responsible for creating its
 * own mount node. Delegating that here keeps the three entry stubs
 * trivial and guarantees a single, identical root layout across views.
 */
export function mount(element) {
    const el = document.createElement('div');
    el.id = 'ponypoll-root';
    el.style.cssText = 'height:100%;';
    document.body.appendChild(el);
    ReactDOM.render(element, el);
}
