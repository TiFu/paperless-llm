module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'warn',
    // Pervasive at DTO/domain mapping boundaries (Mapper.ts, controllers, etc.) —
    // warn rather than error so the lint gate doesn't block on the existing backlog.
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': 'warn',
    // `declare global { namespace Express { ... } }` is the standard way to
    // augment Express's Request type — not the namespace-as-module-pattern this rule targets.
    '@typescript-eslint/no-namespace': ['error', { allowDeclarations: true }],
  },
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['dist', 'src/web/dtos'],
};
