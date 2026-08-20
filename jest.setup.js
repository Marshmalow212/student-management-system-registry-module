// Jest setup file for global test configuration

// Mock environment variables for tests
process.env.SESSION_SECRET = "test-session-secret-at-least-16-chars";
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/sms_test";
