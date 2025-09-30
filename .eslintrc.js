module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'filenames'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  env: {
    node: true,
    es2021: true,
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    eqeqeq: ['error', 'always'],
    curly: ['error', 'all'],
    'no-console': 'warn',
    '@typescript-eslint/naming-convention': [
      'error',
      { selector: 'variable', format: ['camelCase'] },
    ],
    // ✅ règle générale : interdit Majuscules et underscores
    'filenames/match-regex': ['error', '^(?!.*[A-Z])(?!.*_).+$', true],
  },
  overrides: [
    {
      files: ['*.js'], // ne valide pas les fichiers de config
      rules: {
        'filenames/match-regex': 'off',
      },
    },
    {
      files: ['**/controllers/*.ts'],
      rules: {
        // ✅ impose .controllers.ts (pas de camelCase ni snake_case)
        'filenames/match-regex': [
          'error',
          '^(?:[a-z]+(-[a-z]+)*)\\.controllers$', // eslint-plugin-filenames ignore l’extension .ts
          true,
        ],

        // ✅ chaque fonction exportée doit avoir un type de retour explicite
        '@typescript-eslint/explicit-module-boundary-types': 'error',

        // ✅ impose que les interfaces commencent par IReq* ou IRes*
        '@typescript-eslint/naming-convention': [
          'error',
          {
            selector: 'interface',
            format: ['PascalCase'],
            prefix: ['IReq', 'IRes'],
          },
        ],
      },
    },
  ],
};
