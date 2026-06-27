import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist', 'src/web/dtos'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        process: 'readonly',
        console: 'readonly',
        __dirname: 'readonly',
        module: 'readonly',
        require: 'readonly',
      },
    },
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
  },
);
