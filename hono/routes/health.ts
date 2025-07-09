import { Hono } from "hono";

const health = new Hono();

health.get("/health", (c) => {
  return c.json({
    status: "ok",
    message: "Service is running",
  });
});

export { health };
