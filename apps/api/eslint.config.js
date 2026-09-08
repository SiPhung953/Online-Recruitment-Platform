import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
    globalIgnores([
        // Normal/Safe to ignore
        'node_modules/**',
        'dist/**',
        'src/generated/**',
        'uploads/**',
        // Worth ignoring
        'prisma/migrations/**', // SQL, and hand-editing a generated migration is already unusual.
        'tsconfig.tsbuildinfo' // incremental build artifact.
    ]),
    {
        files: ['**/*.ts'],
        extends: [
            js.configs.recommended,
            tseslint.configs.recommended,
        ],
        languageOptions: {
            globals: globals.node,
        },
    },
])