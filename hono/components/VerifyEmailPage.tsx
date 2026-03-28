type VerifyEmailPageProps = {
  email: string;
  error?: string;
  success?: string;
};

export async function VerifyEmailPage({ email, error, success }: VerifyEmailPageProps) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Verify Email - MLack</title>
        <link rel="stylesheet" href="/components/AuthPage.css" />
      </head>
      <body>
        <div className="auth-container">
          <h1 className="page-title">Verify Your Email</h1>

          <p className="verify-description">
            We sent a 6-digit code to <strong>{email}</strong>. Enter it below to complete your registration.
          </p>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <form method="post" action="/auth/verify-email" className="auth-form">
            <input type="hidden" name="email" value={email} />
            <div className="form-group">
              <label htmlFor="code">Verification Code</label>
              <input
                type="text"
                id="code"
                name="code"
                placeholder="Enter 6-digit code"
                required
                maxLength={6}
                minLength={6}
                pattern="\d{6}"
                autoComplete="one-time-code"
                inputMode="numeric"
                className="verification-code-input"
              />
            </div>
            <button type="submit" className="auth-button">
              Verify
            </button>
          </form>

          <div className="resend-section">
            <p className="resend-text">Didn't receive the code?</p>
            <form method="post" action="/auth/resend-code">
              <input type="hidden" name="email" value={email} />
              <button type="submit" className="resend-button">
                Resend Code
              </button>
            </form>
          </div>

          <p className="auth-link">
            <a href="/auth/register">Back to registration</a>
          </p>
        </div>
      </body>
    </html>
  );
}
