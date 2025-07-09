import { describe, expect, it } from "vitest";
import { ChatPage } from "./ChatPage.js";

describe("CSS-in-JS integration test", () => {
  it("should include actual CSS rules in the style tag", async () => {
    const jsxElement = await ChatPage();
    
    // Convert JSX to string to test content
    const html = jsxElement.toString();
    console.log("HTML output length:", html.length);
    
    // Check if the hono-css style tag contains actual CSS rules
    const styleTagMatch = html.match(/<style id="hono-css">([^<]*)<\/style>/);
    if (styleTagMatch) {
      const cssContent = styleTagMatch[1];
      console.log("CSS content length:", cssContent.length);
      console.log("CSS content:", cssContent);
      
      // Should contain CSS rules for the generated classes
      expect(cssContent).toContain("background-color");
    } else {
      console.log("No hono-css style tag found");
      expect(false).toBe(true); // Fail the test
    }
  });
});