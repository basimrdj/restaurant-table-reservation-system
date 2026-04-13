module.exports = {
  testEnvironment: "node",
  testMatch: ["**/?(*.)+(spec).[jt]s?(x)"],
  globalTeardown: "<rootDir>/src/__tests__/globalTeardown.js",
};
