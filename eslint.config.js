module.exports = {
  root: true,
  extends: ['expo'],
  ignorePatterns: ['/dist/*', '/reference/*', '/*.config.js'],
  rules: {
    // Allow unused args prefixed with underscore (common in stubs/callbacks)
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
  },
};
