import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';
import globals from 'globals';

export default [
    js.configs.recommended,
    {
        files: ['**/*.{js,jsx}'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            parserOptions: {
                ecmaFeatures: { jsx: true },
            },
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.es2021,
            },
        },
        plugins: {
            react,
            'react-hooks': reactHooks,
            import: importPlugin,
        },
        rules: {
            ...react.configs.recommended.rules,
            ...reactHooks.configs.recommended.rules,
            'no-undef': 'error',
            'no-use-before-define': ['error', { variables: true, functions: true }],
            'no-unused-vars': 'warn',
            'import/no-unresolved': 'error',
            'react/react-in-jsx-scope': 'off', // React 17+ không cần import React
        },
        settings: {
            react: { version: 'detect' },
        },
    },
];