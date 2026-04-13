import { Layout } from "./Layout.js";

export async function RegisterPage(error?: string) {
  return (
    <Layout title="Register" css="/components/AuthPage.css">
      <div className="auth-container">
        <h1 className="page-title">Create an Account</h1>

        {error && <div className="error-message">{error}</div>}

        <form method="post" action="/auth/register" className="auth-form">
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input type="text" id="name" name="name" placeholder="Your name" required />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input type="email" id="email" name="email" placeholder="you@example.com" required />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Choose a password (min 8 characters)"
              required
              minLength={8}
            />
          </div>
          <button type="submit" className="auth-button">
            Register
          </button>
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <a href="/auth/google" className="google-button">
          Sign up with Google
        </a>

        <p className="auth-link">
          Already have an account? <a href="/auth/login">Login</a>
        </p>
      </div>
    </Layout>
  );
}
