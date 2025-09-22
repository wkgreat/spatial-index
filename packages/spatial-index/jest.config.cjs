
const path = require('path');

module.exports = {

    preset: "ts-jest",

    testEnvironment: 'node',

    roots: ['<rootDir>/test'],

    transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', { useESM: true }]
    },

    extensionsToTreatAsEsm: ['.ts'],

    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

    testPathIgnorePatterns: ['/node_modules/'],

    testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',

    moduleDirectories: [
        'node_modules',
        '<rootDir>/../node_modules'
    ],

    moduleNameMapper: {
        '^jsts$': [
            'jsts/dist/jsts.min.js',
            'jsts/dist/jsts.js',
        ]
    }
};