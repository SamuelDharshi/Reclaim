/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testMatch: ['**/tests/**/*.test.ts'],
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/jest.tsconfig.json',
    },
  },
  // Silence Next.js-specific module resolution warnings
  modulePathIgnorePatterns: ['<rootDir>/.next/'],
  // Each test file gets a fresh module registry — important for prisma singleton
  // but we share state via the real SQLite file; --runInBand handles ordering
  testTimeout: 30000,
}
