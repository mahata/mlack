import type { Context } from "hono";
import type { HtmlEscapedString } from "hono/utils/html";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { Env } from "../types.js";

export function renderPage(
  c: Context<Env>,
  page: HtmlEscapedString | Promise<HtmlEscapedString>,
  status?: ContentfulStatusCode,
) {
  const html = page instanceof Promise ? page.then((p) => `<!DOCTYPE html>${p}`) : `<!DOCTYPE html>${page}`;
  return c.html(html, status);
}
