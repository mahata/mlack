import type { Child } from "hono/jsx";

type LayoutProps = {
  title: string;
  css: string | string[];
  scripts?: string[];
  viewportFit?: boolean;
  children: Child;
};

export function Layout({ title, css, scripts, viewportFit, children }: LayoutProps) {
  const cssFiles = ["/components/common.css", ...(Array.isArray(css) ? css : [css])];
  const viewportContent = viewportFit
    ? "width=device-width, initial-scale=1.0, viewport-fit=cover"
    : "width=device-width, initial-scale=1.0";

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content={viewportContent} />
        <title>{title} - Mlack</title>
        {cssFiles.map((href) => (
          <link rel="stylesheet" href={href} />
        ))}
      </head>
      <body>
        {children}
        {scripts?.map((src) => (
          <script src={src} />
        ))}
      </body>
    </html>
  );
}
