import { raw } from "hono/html";
import type { Child } from "hono/jsx";

type LayoutProps = {
  title?: string;
  css: string;
  script?: string;
  viewportFit?: boolean;
  children: Child;
};

export function Layout({ title, css, script, viewportFit, children }: LayoutProps) {
  return (
    <>
      {raw("<!DOCTYPE html>")}
      <html lang="en">
        <head>
          <meta charSet="UTF-8" />
          <meta
            name="viewport"
            content={`width=device-width, initial-scale=1.0${viewportFit ? ", viewport-fit=cover" : ""}`}
          />
          <title>{title ? `${title} - Mlack` : "Mlack"}</title>
          <link rel="stylesheet" href="/components/common.css" />
          <link rel="stylesheet" href={css} />
        </head>
        <body>
          {children}
          {script && <script src={script} />}
        </body>
      </html>
    </>
  );
}
