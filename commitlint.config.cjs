module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'subject-case': [0],
    'scope-empty': [2, 'never'],
    'scope-enum': [2, 'always', ['server', 'frontend', 'build', 'testing', 'docs']],
  },
};
