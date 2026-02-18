'use strict';

module.exports = {
    env: {
        node: true,
        es2022: true,
    },
    parserOptions: {
        ecmaVersion: 2022,
    },
    rules: {
        // Errors
        'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
        'no-console': 'warn',
        'no-undef': 'error',

        // Style
        'semi': ['error', 'always'],
        'quotes': ['error', 'single', { avoidEscape: true }],
        'comma-dangle': ['error', 'always-multiline'],
        'eol-last': ['error', 'always'],
        'no-trailing-spaces': 'error',
        'indent': ['error', 2, { SwitchCase: 1 }],

        // Best practices
        'eqeqeq': ['error', 'always'],
        'no-var': 'error',
        'prefer-const': 'error',
        'no-throw-literal': 'error',
        'no-return-await': 'error',
        'require-await': 'warn',
    },
};
