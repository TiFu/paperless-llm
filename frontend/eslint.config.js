import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  {
    ignores: ['dist', 'src/services/api/generated'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactRefresh.configs.recommended,
  {
    plugins: {
      'react-hooks': reactHooks,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
      },
    },
    rules: {
      'no-constant-condition': ['error', { checkLoops: false }],
      // Codebase uses `any` and has unused imports/locals pervasively at API/store
      // boundaries; downgraded to warn so the lint gate can go in without a
      // separate mass-cleanup pass. Revisit once the backlog is addressed.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      'react-refresh/only-export-components': 'error',
      // Match the pre-migration `plugin:react-hooks/recommended` ruleset (v4-era):
      // just rules-of-hooks + exhaustive-deps. v7's bundled presets add many new,
      // stricter rules (set-state-in-effect, immutability, etc.) that surface
      // real findings in existing code — out of scope for a config-format migration.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
);
