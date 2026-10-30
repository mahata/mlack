import { describe, expect, it } from "vitest";
import { Layout } from "./Layout.js";

function render(props: { title?: string; script?: string; viewportFit?: boolean } = {}) {
  return String(
    <Layout css="/test.css" {...props}>
      <div>content</div>
    </Layout>,
  );
}

describe("Layout component", () => {
  it("should render a full HTML document with the shared stylesheet before the page stylesheet", () => {
    const html = render({ title: "Test" });

    expect(html.startsWith('<!DOCTYPE html><html lang="en">')).toBe(true);
    expect(html).toContain('<meta charSet="UTF-8"/>');
    expect(html).toContain("<title>Test - Mlack</title>");
    expect(html).toContain("<div>content</div>");
    expect(html.indexOf('href="/components/common.css"')).toBeLessThan(html.indexOf('href="/test.css"'));
  });

  it("should use the app name as the default title", () => {
    expect(render()).toContain("<title>Mlack</title>");
  });

  it("should render the script after the page content", () => {
    const html = render({ script: "/app.js" });

    expect(html.indexOf('<script src="/app.js">')).toBeGreaterThan(html.indexOf("<div>content</div>"));
    expect(render()).not.toContain("<script");
  });

  it("should only include viewport-fit=cover when requested", () => {
    expect(render({ viewportFit: true })).toContain("width=device-width, initial-scale=1.0, viewport-fit=cover");
    expect(render()).toContain('content="width=device-width, initial-scale=1.0"');
  });
});
