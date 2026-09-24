import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import { merge } from 'webpack-merge';
import baseConfig from '@splunk/webpack-configs/base.config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const distFolder = path.resolve(__dirname, '..', 'dist');

const config = merge(baseConfig.default, {
    entry: {
        // Splunk's first-party pages/splunk_ui_app.html template loads the
        // entry script from /static/app/<app>/pages/<view>.js, so entry
        // names must match the view names in default/data/ui/views.
        poll:      './web/entries/poll.js',
        play:      './web/entries/play.js',
        projector: './web/entries/projector.js',
    },
    output: {
        filename: 'pages/[name].js',
        // Async chunks (both explicit React.lazy imports and the root code
        // pulled in via the entries' dynamic imports) live alongside the
        // entry so `publicPath: 'auto'` resolves them from a stable base.
        chunkFilename: 'pages/[name].[contenthash].chunk.js',
        path: path.join(distFolder, 'appserver', 'static'),
        // `auto` derives the base URL from the currently-executing entry
        // script at runtime, picking up Splunk's locale prefix and its
        // /static/@<build>.<bump>/ cache-busting segment automatically —
        // both of which a hardcoded path could not know about.
        publicPath: 'auto',
        clean: true,
    },
    plugins: [
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: path.join(__dirname, 'package'),
                    to: distFolder,
                },
            ],
        }),
    ],
    resolve: {
        fallback: { querystring: false },
    },
});

export default config;
