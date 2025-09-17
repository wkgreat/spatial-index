import { glob } from 'glob'
import resolve from '@rollup/plugin-node-resolve';

const entries = glob.sync('src/**/*.js');

export default [
    // mjs
    {
        input: entries,
        output: {
            dir: "dist/spatial-index/esm",
            format: 'esm',
            preserveModules: true,
            preserveModulesRoot: 'src',
            entryFileNames: '[name].js',
            sourcemap: true
        },
        plugins: [
            resolve()
        ],
        external: ['cytoscape']
    },
    {
        input: 'src/index.js',
        output: {
            dir: 'dist/spatial-index/cjs',
            format: 'cjs',
            sourcemap: true,
            preserveModules: true,
            preserveModulesRoot: 'src',
            exports: 'named',
        },
        plugins: [resolve()],
        external: ['cytoscape'],
    },
];