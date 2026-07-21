// .eslintrc.cjs
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'jsx-a11y', 'import', 'prettier'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react/jsx-runtime',
    'plugin:jsx-a11y/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier',
  ],
  env: {
    browser: true,
    node: true,
    es6: true,
  },
  rules: {
    // TypeScript
    '@typescript-eslint/no-explicit-any': 'warn', // Temporarily turn off for fixing phase
    '@typescript-eslint/explicit-module-boundary-types': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/strict-boolean-expressions': 'off', // Temporarily turn off
    '@typescript-eslint/no-floating-promises': 'warn',
    '@typescript-eslint/prefer-nullish-coalescing': 'warn',
    '@typescript-eslint/prefer-optional-chain': 'warn',
    '@typescript-eslint/no-use-before-define': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'off', // Temporarily turn off
    '@typescript-eslint/no-unsafe-member-access': 'off', // Temporarily turn off
    '@typescript-eslint/no-unsafe-call': 'off', // Temporarily turn off
    '@typescript-eslint/no-unsafe-return': 'off', // Temporarily turn off
    '@typescript-eslint/no-unsafe-argument': 'off', // Temporarily turn off
    '@typescript-eslint/no-misused-promises': 'warn',

    // React & Hooks
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'off',
    'react/button-has-type': 'warn',
    'react/no-array-index-key': 'warn',
    'react/jsx-no-bind': 'off', // Turn off to allow functions in JSX
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
    'react/jsx-uses-react': 'off',
    'react/jsx-props-no-spreading': 'off',
    'react/jsx-one-expression-per-line': 'off',
    'react/jsx-indent': 'off',
    'react/jsx-indent-props': 'off',
    'react/jsx-curly-newline': 'off',
    'react/jsx-wrap-multilines': 'off',
    'react/jsx-tag-spacing': 'off',
    'react/jsx-closing-bracket-location': 'off',
    'react/jsx-curly-brace-presence': 'off',
    'react/jsx-boolean-value': 'off',
    'react/function-component-definition': 'off',
    'react/no-unstable-nested-components': 'warn',
    'react/jsx-fragments': 'off',
    'react/jsx-max-props-per-line': 'off',
    'react/jsx-first-prop-new-line': 'off',
    'react/jsx-no-useless-fragment': 'off',
    'react/destructuring-assignment': 'off',
    'react/no-unescaped-entities': 'off',

    // Imports
    'import/order': ['warn', {
      groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
      'newlines-between': 'always',
    }],
    'import/no-cycle': 'error',
    'import/no-extraneous-dependencies': 'off',
    'import/extensions': 'off',
    'import/no-duplicates': 'warn',
    'import/no-named-as-default': 'off',
    'import/prefer-default-export': 'off',
    'import/no-useless-path-segments': 'off',
    'import/no-unresolved': 'off', // Turn off until we fix path aliases

    // Other rules that caused many errors
    'no-unused-expressions': 'off',
    'no-void': 'off',
    'no-console': 'off',
    'no-param-reassign': 'off',
    'no-use-before-define': 'off', // Handled by TypeScript rule
    'no-nested-ternary': 'off',
    'no-shadow': 'off', // Handled by TypeScript rule
    'no-underscore-dangle': 'off',
    'no-restricted-syntax': 'off',
    'no-await-in-loop': 'off',
    'no-trailing-spaces': 'warn',
    'no-multi-spaces': 'warn',
    'no-plusplus': 'off',
    'no-unused-vars': 'off', // Handled by TypeScript rule
    'max-len': ['warn', { code: 250, ignoreComments: true, ignoreStrings: true, ignoreTemplateLiterals: true }],
    'arrow-body-style': 'off',
    'operator-linebreak': 'off',
    'implicit-arrow-linebreak': 'off',
    'function-paren-newline': 'off',
    'object-curly-newline': 'off',
    'block-spacing': 'warn',
    'padded-blocks': 'off',
    'no-multiple-empty-lines': ['warn', { max: 2 }],
    'consistent-return': 'off',
    'prefer-template': 'warn',
    'prefer-destructuring': 'off',
    'object-shorthand': 'warn',
    'jsx-quotes': 'off',
    'quote-props': 'off',
    'radix': 'off',
    'spaced-comment': 'warn',
    'curly': 'off',
    'eol-last': 'warn',
    'no-mixed-operators': 'off',
    'no-confusing-arrow': 'off',
  },
  settings: {
    react: { 
      version: 'detect',
    },
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json',
      },
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
  },
  ignorePatterns: ['dist', 'node_modules', 'vite.config.ts', '*.d.ts'],
};
