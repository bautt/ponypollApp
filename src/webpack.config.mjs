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
        poll: './web/index.js',
    },
    output: {
        filename: '[name].bundle.js',
        path: path.join(distFolder, 'appserver', 'static'),
        publicPath: '/static/app/ponypollapp/',
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
