module.exports = {
  extends: 'airbnb-base',
  globals: {
    document: true,
    chrome: true,
    fetch: true,
  },
  rules: {
    'max-len': [
      'error',
      {
        ignoreComments: true,
        ignoreTrailingComments: true,
        ignoreUrls: true,
        ignoreStrings: true,
        code: 100,
      },
    ],
  },
};
