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

import type { UserConfig } from '@commitlint/types';

const config: UserConfig = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Subject line case
    'subject-case': [2, 'always', 'lower-case'] as const,

    // Subject line not empty
    'subject-empty': [2, 'never'] as const,

    // Subject line max length
    'subject-max-length': [2, 'always', 100] as const,

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
    ] as const,

    // Type must be lower case
    'type-case': [2, 'always', 'lower-case'] as const,

    // Type must not be empty
    'type-empty': [2, 'never'] as const,

    // Body max length
    'body-max-line-length': [2, 'always', 100] as const,

    // Header max length
    'header-max-length': [2, 'always', 150] as const,
  },
};

export default config;
