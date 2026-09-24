/**
 * Projector root — read-only wall-screen view for synchronized sessions.
 *
 * Bootstraps the /projector Splunk view. Mounted exclusively by
 * entries/projector.js so nothing here needs to sniff the URL to decide
 * what to render.
 */
import React from 'react';
import { ErrorBoundary, GlobalStyle } from '../App';
import ProjectorPage from '../pages/ProjectorPage';
import { mount } from './mount';

function ProjectorApp() {
    return (
        <ErrorBoundary>
            <GlobalStyle />
            <ProjectorPage />
        </ErrorBoundary>
    );
}

export default function projectorRoot() {
    mount(<ProjectorApp />);
}
