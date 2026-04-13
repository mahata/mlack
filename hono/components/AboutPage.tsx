import { Layout } from "./Layout.js";

export async function AboutPage() {
  return (
    <Layout title="About" css="/components/AboutPage.css">
      <div className="about-container">
        <h1 className="page-title">About Mlack</h1>

        <div className="content">
          <p>
            Mlack is a Slack-like application that's fully open source. The source code is available at{" "}
            <a href="https://github.com/mahata/mlack" target="_blank" rel="noopener noreferrer">
              @mahata/mlack
            </a>
            .
          </p>

          <p>
            This is an experimental project designed to build a real-world application using "Vibe Coding". Around 90%
            of the code is written by{" "}
            <a
              href="https://docs.github.com/en/copilot/concepts/about-copilot-coding-agent"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub Copilot Coding Agent
            </a>
            .
          </p>

          <p>
            The project explores what's possible when combining human creativity with AI assistance to rapidly prototype
            and build functional applications.
          </p>
        </div>

        <div className="navigation">
          <a href="/" className="back-link">
            ← Back to Chat
          </a>
        </div>
      </div>
    </Layout>
  );
}
