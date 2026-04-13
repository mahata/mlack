import { Layout } from "./Layout.js";

export async function LoginPage(error?: string) {
  return (
    <Layout title="Login" css="/components/AuthPage.css">
      <div className="auth-container">
        <h1 className="page-title">Login to Mlack</h1>

        {error && <div className="error-message">{error}</div>}

        <form method="post" action="/auth/login" className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input type="email" id="email" name="email" placeholder="you@example.com" required />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input type="password" id="password" name="password" placeholder="Your password" required />
          </div>
          <button type="submit" className="auth-button">
            Login
          </button>
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <a href="/auth/google" className="google-button">
          Login with Google
        </a>

        <p className="auth-link">
          Don't have an account? <a href="/auth/register">Register</a>
        </p>
      </div>
    </Layout>
  );
}
