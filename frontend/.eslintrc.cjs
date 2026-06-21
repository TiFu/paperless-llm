module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint', 'react-hooks', 'react-refresh'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  rules: {
    'react-refresh/only-export-components': 'warn',
    'no-constant-condition': ['error', { checkLoops: false }],
    // Codebase uses `any` and has unused imports/locals pervasively at API/store
    // boundaries; downgraded to warn so the lint gate can go in without a
    // separate mass-cleanup pass. Revisit once the backlog is addressed.
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': 'warn',
  },
  env: {
    browser: true,
    es2022: true,
  },
  ignorePatterns: ['dist', 'src/services/api/generated'],
};
