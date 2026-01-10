module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['security', 'import', 'promise'],
  rules: {
    // Security rules
    'security/detect-object-injection': 'warn',
    'security/detect-non-literal-regexp': 'error',
    'security/detect-unsafe-regex': 'error',
    'security/detect-buffer-noassert': 'error',
    'security/detect-child-process': 'warn',
    'security/detect-disable-mustache-escape': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-no-csrf-before-method-override': 'error',
    'security/detect-non-literal-fs-filename': 'warn',
    'security/detect-non-literal-require': 'error',
    'security/detect-possible-timing-attacks': 'warn',
    'security/detect-pseudoRandomBytes': 'error',

    // Import rules
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],

    // Promise rules
    'promise/always-return': 'error',
    'promise/no-return-wrap': 'error',
    'promise/param-names': 'error',
    'promise/catch-or-return': 'error',
    'promise/no-native': 'off',
    'promise/no-nesting': 'warn',
    'promise/no-promise-in-callback': 'warn',
    'promise/no-callback-in-promise': 'warn',
    'promise/avoid-new': 'off',
    'promise/no-new-statics': 'error',
    'promise/no-return-in-finally': 'warn',
    'promise/valid-params': 'warn',

    // General code quality rules
    // Allow console in services that use structured logging
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'error',
    'no-alert': 'error',
    'no-var': 'error',
    'prefer-const': 'error',
    'prefer-arrow-callback': 'error',
    'arrow-spacing': 'error',
    'no-duplicate-imports': 'error',
    'no-useless-constructor': 'error',
    'no-useless-rename': 'error',
    'object-shorthand': 'error',
    'prefer-destructuring': 'warn',
    'prefer-template': 'error',
    'template-curly-spacing': 'error',
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    'no-sequences': 'error',
    'no-throw-literal': 'error',
    'no-unmodified-loop-condition': 'error',
    'no-unused-expressions': 'error',
    'no-useless-call': 'error',
    'no-useless-concat': 'error',
    'no-void': 'error',
    radix: 'error',
    'wrap-iife': 'error',
    yoda: 'error',
  },
  overrides: [
    {
      // TypeScript files in services - each service has its own tsconfig
      files: [
        'admin-service/src/**/*.ts',
        'search-service/src/**/*.ts',
        'payment-queue-service/src/**/*.ts',
        'social-service/src/**/*.ts',
        'api-gateway/src/**/*.ts',
        'delivery-service/src/**/*.ts',
        'notifications-service/src/**/*.ts',
        'taxi-realtime-service/src/**/*.ts',
        'shared/**/*.ts',
      ],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        // Use each service's own tsconfig
        project: null,
      },
      plugins: ['@typescript-eslint'],
      extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
      rules: {
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/no-explicit-any': 'warn',
        // Disable rules that require type information when project is null
        '@typescript-eslint/prefer-nullish-coalescing': 'off',
        '@typescript-eslint/prefer-optional-chain': 'off',
      },
    },
    {
      // Test files
      files: ['**/*.test.ts', '**/*.spec.ts', 'tests/**/*.ts'],
      env: {
        jest: true,
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'security/detect-object-injection': 'off',
        'no-console': 'off',
      },
    },
  ],
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    'coverage/',
    '*.min.js',
    'supabase/migrations/',
    'supabase/functions/',
    'supabase/types.ts',
    'docs/',
    '**/*.d.ts',
    'tests/',
  ],
};
