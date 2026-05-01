/**
 * Jest Babel Config for TypeScript ESM
 */

export default {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    '@babel/preset-typescript',
  ],
};
