import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import { defineConfig } from 'eslint/config';
import globals from 'globals';

/**
 * Common ESLint rules shared between JavaScript and TypeScript files
 * @type {import('eslint').Linter.RulesRecord}
 */
const commonRules = {
    // ESLint Core Rules
    // Enforce 4-space indentation with special handling for switch cases
    indent: ['error', 4, { SwitchCase: 1 }],
    // Disallow console.log but allow console.warn for debugging
    'no-console': ['error', { allow: ['warn', 'log'] }],
    // Allow constant conditions (useful for while(true) loops)
    'no-constant-condition': ['off'],
    // Allow direct prototype builtin access
    'no-prototype-builtins': ['off'],
    // Enforce spaces inside object curly braces, but not between braces
    'object-curly-spacing': ['error', 'always', { objectsInObjects: false }],
    // Enforce single quotes for strings
    quotes: ['error', 'single'],
    // Require semicolons at the end of statements
    semi: ['error', 'always'],
    // Disallow space before function parentheses
    'space-before-function-paren': ['error', 'never'],
    // Enforce const for variables that are never reassigned
    'prefer-const': ['error'],
    // Allow var declarations (legacy code support)
    'no-var': ['off'],
};

/**
 * Combined ESLint config supporting both JavaScript (.js, .jsx, .mjs) and
 * TypeScript (.ts, .tsx, .mts) files in a single config.
 */
const combinedConfig = defineConfig([
    {
        ignores: ['.github/', '_site/', '**/build/', '**/dist/', '**/node_modules/', '**/.angular/'],
    },
    {
        // Common globals for all checked files
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
    },
    {
        // JavaScript base config - applies to all .js, .jsx, .mjs files
        files: ['**/*.js', '**/*.jsx', '**/*.mjs'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            parserOptions: {
                ecmaFeatures: { jsx: true },
            },
        },
        extends: [js.configs.recommended],
        rules: {
            // Apply common rules
            ...commonRules,

            // Report unused variables (local scope only, ignore function arguments)
            'no-unused-vars': ['error', { vars: 'local', args: 'none' }],
        },
    },
    {
        // TypeScript base config - applies to all .ts, .tsx, .mts files
        files: ['**/*.ts', '**/*.tsx', '**/*.mts'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 2022,
                ecmaFeatures: { jsx: true },
                sourceType: 'module',
            },
        },
        plugins: {
            '@typescript-eslint': tsPlugin,
        },
        extends: [
            js.configs.recommended,
            ...tsPlugin.configs['flat/recommended'],
        ],
        rules: {
            // Reuse common rules (from JavaScript config)
            ...commonRules,
            '@typescript-eslint/no-namespace': ['off'],
            // TypeScript rules
            // Allow empty object types (e.g., {})
            '@typescript-eslint/no-empty-object-type': ['off'],
            // Disable unused vars checking (handled by project configs)
            '@typescript-eslint/no-unused-vars': ['off'],
            // Enforce separate type imports for better tree-shaking and clarity
            '@typescript-eslint/consistent-type-imports': [
                'error',
                {
                    prefer: 'type-imports',
                    fixStyle: 'separate-type-imports',
                },
            ],
        },
    },
]);

export default combinedConfig;
