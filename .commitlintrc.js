/**
 * Commitlint Configuration
 * Enforces conventional commit messages for team consistency
 * 
 * Format: <type>(<scope>): <subject>
 * 
 * Types:
 *   feat:     New feature
 *   fix:      Bug fix
 *   docs:     Documentation changes
 *   style:    Code style changes (formatting, etc)
 *   refactor: Code refactoring
 *   test:     Adding tests
 *   chore:    Maintenance tasks
 * 
 * Examples:
 *   feat(auth): add JWT refresh token
 *   fix(users): resolve email validation issue
 *   docs(readme): update installation guide
 *   refactor(prisma): optimize user queries
 *   test(auth): add login test cases
 */

module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Subject line case
    'subject-case': [2, 'lower-case'],
    
    // Subject line not empty
    'subject-empty': [2, 'never'],
    
    // Subject line max length
    'subject-max-length': [2, 'always', 100],
    
    // Type must be one of the values
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
        'wip',
      ],
    ],
    
    // Type must be lower case
    'type-case': [2, 'always', 'lower-case'],
    
    // Type must not be empty
    'type-empty': [2, 'never'],
    
    // Body max length
    'body-max-line-length': [2, 'always', 100],
    
    // Header max length
    'header-max-length': [2, 'always', 150],
  },
};
