import { describe, expect, it } from "vitest";
import { AboutPage } from "./AboutPage.js";

describe("AboutPage component", () => {
  it("should include CSS stylesheet", async () => {
    const jsxElement = await AboutPage();

    const html = jsxElement.toString();
    expect(html).toContain('href="/components/AboutPage.css"');
  });

  it("should contain required content about the project", async () => {
    const jsxElement = await AboutPage();

    const html = jsxElement.toString();
    
    // Check for all required content elements
    expect(html).toContain("About Mlack");
    expect(html).toContain("Slack-like application that&#39;s fully open source");
    expect(html).toContain("@mahata/mlack");
    expect(html).toContain("experimental project");
    expect(html).toContain("Vibe Coding");
    expect(html).toContain("90% of the code is written by");
    expect(html).toContain("GitHub Copilot Coding Agent");
  });

  it("should have proper navigation back to main page", async () => {
    const jsxElement = await AboutPage();

    const html = jsxElement.toString();
    expect(html).toContain('href="/"');
    expect(html).toContain("← Back to Chat");
  });

  it("should have proper HTML structure", async () => {
    const jsxElement = await AboutPage();

    const html = jsxElement.toString();
    expect(html).toContain('<html lang="en">');
    expect(html).toContain("<title>About - Mlack</title>");
    expect(html).toContain('class="about-container"');
    expect(html).toContain('class="page-title"');
    expect(html).toContain('class="content"');
    expect(html).toContain('class="navigation"');
  });

  it("should include external links with proper attributes", async () => {
    const jsxElement = await AboutPage();

    const html = jsxElement.toString();
    
    // Check that external links have proper security attributes
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    
    // Check for the GitHub link
    expect(html).toContain('href="https://github.com/mahata/mlack"');
    
    // Check for the Copilot documentation link
    expect(html).toContain('href="https://docs.github.com/en/copilot/concepts/about-copilot-coding-agent"');
  });
});