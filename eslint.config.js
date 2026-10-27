const expoFlat = require('eslint-config-expo/flat');

module.exports = [
  ...expoFlat,
  {
    ignores: ['/dist/*', '/reference/*', '/node_modules/*', '/*.config.js'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // Allow unused args prefixed with underscore (common in stubs/callbacks)
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-unused-vars': 'off',
    },
  },
];
