import { glob } from 'glob'
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';

const entries = glob.sync('src/**/*.ts');

export default [
    // mjs
    {
        input: entries,
        output: {
            dir: "dist/esm",
            format: 'esm',
            preserveModules: true,
            preserveModulesRoot: 'src',
            entryFileNames: '[name].js',
            sourcemap: true
        },
        plugins: [
            resolve(), typescript({
                tsconfig: "./tsconfig.json",
                declaration: false,
                declarationMap: false,
                emitDeclarationOnly: false,
                declarationDir: null
            }), commonjs()
        ],
        external: ['cytoscape']
    },
    //cjs
    {
        input: entries,
        output: {
            dir: 'dist/cjs',
            format: 'cjs',
            sourcemap: true,
            preserveModules: true,
            preserveModulesRoot: 'src',
            exports: 'named',
        },
        plugins: [resolve(), typescript({
            tsconfig: "./tsconfig.json",
            declaration: false,
            declarationMap: false,
            emitDeclarationOnly: false,
            declarationDir: null
        }), commonjs()],
        external: ['cytoscape'],
    }
];