---
name: hono-jsx
description: Load this skill when working on Hono JSX components, server-side rendering, or page layouts
---

# Hono JSX Patterns for mlack

## Overview

mlack uses **Hono's built-in JSX** for server-side rendering. This is NOT React — there is no client-side hydration, no hooks, no state management.

## Component Pattern

Components are async functions that return complete HTML documents:

```tsx
export const ExamplePage = async (props: { title: string; error?: string }) => (
  <html lang="en">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{props.title}</title>
      <link rel="stylesheet" href="/components/ExamplePage.css" />
    </head>
    <body>
      {props.error && <div className="error">{props.error}</div>}
      <h1>{props.title}</h1>
    </body>
  </html>
);
```

## Rendering in Routes

```ts
app.get("/example", async (c) => {
  return c.html(`<!DOCTYPE html>${await ExamplePage({ title: "Example" })}`);
});
```

Note the template literal wrapping with `<!DOCTYPE html>` prefix.

## JSX Attribute Differences from HTML

| HTML        | Hono JSX      |
|-------------|---------------|
| `class`     | `className`   |
| `for`       | `htmlFor`     |
| `charset`   | `charSet`     |

## CSS

- Plain CSS files co-located in `hono/components/`
- Served as static assets via `/components/*.css`
- No CSS-in-JS, no Tailwind, no CSS modules

## Client-Side Interactivity

- TypeScript files in `hono/static/` are compiled to JS
- Included via `<script>` tags in JSX
- Use vanilla DOM APIs (querySelector, addEventListener, fetch)
- No client-side framework

## XSS Safety

Hono JSX auto-escapes string interpolation by default. To render raw HTML (dangerous), you'd use `dangerouslySetInnerHTML` — avoid this for user content.

## Common Mistakes

1. **Don't use React imports** — Use `hono/jsx` (configured in tsconfig.json)
2. **Don't use hooks** — No useState, useEffect, etc. This is server-only
3. **Don't forget `<!DOCTYPE html>`** — Always wrap with template literal
4. **Don't use `class`** — Use `className` (JSX requirement)
5. **Components must be async functions** — Not arrow functions assigned to const (for consistency)
