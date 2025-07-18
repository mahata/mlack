// Global setup for test environment
beforeAll(() => {
  // Set environment variables
  process.env.GOOGLE_CLIENT_ID = "test-client-id";
  process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
  process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/auth/google/callback";
  process.env.SESSION_SECRET = "test-session-secret";
  process.env.NODE_ENV = "test";

  // Set database environment variables for testing
  process.env.POSTGRES_HOST = "localhost";
  process.env.POSTGRES_PORT = "5432";
  process.env.POSTGRES_USER = "test";
  process.env.POSTGRES_PASSWORD = "test";
  process.env.POSTGRES_DB = "test";
});
