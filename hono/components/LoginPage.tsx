export async function LoginPage(error?: string) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Login - MLack</title>
        <link rel="stylesheet" href="/components/AuthPage.css" />
      </head>
      <body>
        <div className="auth-container">
          <h1 className="page-title">Login to MLack</h1>

          {error && <div className="error-message">{error}</div>}

          <form method="post" action="/auth/login" className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="Your password"
                required
              />
            </div>
            <button type="submit" className="auth-button">Login</button>
          </form>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <a href="/auth/google" className="google-button">Login with Google</a>

          <p className="auth-link">
            Don't have an account? <a href="/auth/register">Register</a>
          </p>
        </div>
      </body>
    </html>
  );
}
