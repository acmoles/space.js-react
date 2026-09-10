import globals from 'globals';
import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  { ignores: ['dist', 'node_modules'] },
  js.configs.recommended,
  reactHooks.configs.flat['recommended-latest'],
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        ...globals.node
      }
    }
  },
  {
    files: ['**/*.js', '**/*.jsx', '**/*.mjs'],
    ignores: [
      'eslint.config.js',
      'vite.config.js',
      '**/rollup.config.js',
      '**/public/assets/js/*.js'
    ],
    plugins: {
      'react-refresh': reactRefresh
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        ...globals.browser
      }
    },
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'arrow-parens': ['error', 'as-needed'],
      'arrow-spacing': ['error', { 'before': true, 'after': true }],
      'comma-dangle': ['warn', 'never'],
      'comma-spacing': ['error', { 'before': false, 'after': true }],
      'curly': ['error', 'multi-line'],
      'eqeqeq': ['error', 'always'],
      'indent': ['error', 4, { 'SwitchCase': 1, 'ignoredNodes': ['TemplateLiteral *', 'JSXElement', 'JSXElement > *', 'JSXAttribute', 'JSXIdentifier', 'JSXNamespacedName', 'JSXMemberExpression', 'JSXSpreadAttribute', 'JSXExpressionContainer', 'JSXOpeningElement', 'JSXClosingElement', 'JSXFragment', 'JSXOpeningFragment', 'JSXClosingFragment', 'JSXText', 'JSXEmptyExpression', 'JSXSpreadChild'] }],
      'key-spacing': ['error', { 'beforeColon': false, 'afterColon': true }],
      'keyword-spacing': ['error', { 'before': true, 'after': true }],
      'linebreak-style': ['error', 'unix'],
      'lines-between-class-members': ['error', 'always', { 'exceptAfterSingleLine': true }],
      'new-parens': 'error',
      'no-inner-declarations': 'off',
      'no-return-await': 'error',
      'object-curly-spacing': ['error', 'always'],
      'object-shorthand': ['error', 'always'],
      'one-var': ['error', { 'initialized': 'never' }],
      'padded-blocks': ['error', 'never'],
      'prefer-arrow-callback': 'error',
      'prefer-const': ['error', { 'destructuring': 'any' }],
      'quotes': ['error', 'single'],
      'semi-spacing': ['error', { 'before': false, 'after': true }],
      'semi': ['error', 'always'],
      'sort-imports': ['error', { 'ignoreDeclarationSort': true }],
      'space-before-blocks': ['error', 'always'],
      'space-before-function-paren': ['error', { 'anonymous': 'always', 'named': 'never', 'asyncArrow': 'always' }],
      'space-in-parens': ['error', 'never'],
      'space-infix-ops': 'error',
      'space-unary-ops': ['error', { 'words': true, 'nonwords': false }]
    }
  }
];
