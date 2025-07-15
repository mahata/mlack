// Global setup for test environment
beforeAll(() => {
  // Set environment variables
  process.env.GOOGLE_CLIENT_ID = "test-client-id";
  process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
  process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/auth/google/callback";
  process.env.SESSION_SECRET = "test-session-secret";
  process.env.NODE_ENV = "test";
});
