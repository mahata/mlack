import { describe, expect, it } from "vitest";
import { Layout } from "./Layout.js";

describe("Layout component", () => {
  it("should always include common.css before page-specific CSS", () => {
    const html = (
      <Layout title="Test" css="/test.css">
        <div>content</div>
      </Layout>
    ).toString();

    expect(html).toContain('href="/components/common.css"');
    expect(html).toContain('href="/test.css"');
    const commonIdx = html.indexOf('href="/components/common.css"');
    const pageIdx = html.indexOf('href="/test.css"');
    expect(commonIdx).toBeLessThan(pageIdx);
  });

  it("should render HTML document with title", () => {
    const html = (
      <Layout title="Test" css="/test.css">
        <div>content</div>
      </Layout>
    ).toString();

    expect(html).toContain('<html lang="en">');
    expect(html).toContain("<title>Test - Mlack</title>");
    expect(html).toContain('href="/test.css"');
    expect(html).toContain("<div>content</div>");
  });

  it("should render multiple CSS files", () => {
    const html = (
      <Layout title="Multi" css={["/a.css", "/b.css"]}>
        <div />
      </Layout>
    ).toString();

    expect(html).toContain('href="/a.css"');
    expect(html).toContain('href="/b.css"');
  });

  it("should render script tags at end of body", () => {
    const html = (
      <Layout title="Scripts" css="/test.css" scripts={["/a.js", "/b.js"]}>
        <div>body</div>
      </Layout>
    ).toString();

    expect(html).toContain('src="/a.js"');
    expect(html).toContain('src="/b.js"');
    const bodyIdx = html.indexOf("<div>body</div>");
    const scriptIdx = html.indexOf('src="/a.js"');
    expect(scriptIdx).toBeGreaterThan(bodyIdx);
  });

  it("should include viewport-fit=cover when viewportFit is true", () => {
    const html = (
      <Layout title="VP" css="/test.css" viewportFit>
        <div />
      </Layout>
    ).toString();

    expect(html).toContain("viewport-fit=cover");
  });

  it("should not include viewport-fit=cover by default", () => {
    const html = (
      <Layout title="VP" css="/test.css">
        <div />
      </Layout>
    ).toString();

    expect(html).not.toContain("viewport-fit");
  });

  it("should include charset and viewport meta tags", () => {
    const html = (
      <Layout title="Meta" css="/test.css">
        <div />
      </Layout>
    ).toString();

    expect(html).toContain('charSet="UTF-8"');
    expect(html).toContain("width=device-width, initial-scale=1.0");
  });
});
