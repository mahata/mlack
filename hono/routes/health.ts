import { Hono } from "hono";

const healthRoute = new Hono();

healthRoute.get("/health", (c) => {
  return c.json({
    status: "ok",
    message: "Service is running",
  });
});

export { healthRoute };
