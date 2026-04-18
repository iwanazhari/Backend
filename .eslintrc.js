module.exports = {
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  extends: [
    'airbnb-base',
    'eslint:recommended',
    'plugin:import/recommended',
    'prettier',
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['import'],
  rules: {
    // Allow console in development
    'no-console': 'off',
    
    // Allow require
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    
    // Import rules
    'import/no-unresolved': 'error',
    'import/named': 'error',
    'import/namespace': 'error',
    'import/default': 'error',
    'import/export': 'error',
    'import/first': 'error',
    'import/newline-after-import': 'error',
    'import/no-duplicates': 'error',
    
    // Allow CommonJS require
    'global-require': 'off',
    'import/no-dynamic-require': 'off',
    
    // Function parameter order (error first)
    'standard/no-callback-literal': 'off',
    
    // Allow non-CamelCase for common patterns
    camelcase: ['error', { properties: 'never', allow: ['^UNSAFE_', '.*_id$', '.*_at$'] }],
    
    // Object property order
    'object-curly-newline': ['error', { multiline: true, minProperties: 3 }],
    
    // Function body style
    'object-shorthand': ['error', 'always', { avoidQuotes: true }],
    
    // Prefer destructuring for arrays and objects
    'prefer-destructuring': ['error', { object: true, array: false }],
    
    // Allow short circuit evaluation
    'no-unused-expressions': ['error', { allowShortCircuit: true, allowTernary: true }],
    
    // Template strings
    'prefer-template': 'error',
    
    // Max line length
    'max-len': ['error', { code: 120, ignoreStrings: true, ignoreTemplateLiterals: true }],
    
    // Function max lines
    'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
    
    // Complexity
    complexity: ['error', { max: 10 }],
    
    // Max depth
    'max-depth': ['error', { max: 4 }],
    
    // Max params
    'max-params': ['error', { max: 4 }],
    
    // Prefer default parameters
    'prefer-default-params': 'off',
    
    // Allow process.env
    'no-process-env': 'off',
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.json'],
      },
    },
  },
  overrides: [
    {
      files: ['tests/**/*.js'],
      env: {
        jest: true,
      },
      rules: {
        'no-underscore-dangle': 'off',
        'prefer-destructuring': 'off',
      },
    },
  ],
};
