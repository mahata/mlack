import { Hono } from "hono";
import { csrf } from "hono/csrf";
import { requireSiteAdmin } from "./auth/requireSiteAdmin.js";
import { requireUser } from "./auth/requireUser.js";
import { sessionMiddleware } from "./auth/session.js";
import { authRoute } from "./routes/auth.js";
import { channelsRoute } from "./routes/channels.js";
import { directMessagesRoute } from "./routes/directMessages.js";
import { emailAuthRoute } from "./routes/emailAuth.js";
import { healthRoute } from "./routes/health.js";
import { indexRoute } from "./routes/index.js";
import { messagesRoute } from "./routes/messages.js";
import { siteAdminRoute } from "./routes/siteAdmin.js";
import { testAuthRoute } from "./routes/testAuth.js";
import { uploadsRoute } from "./routes/uploads.js";
import { wsRoute } from "./routes/ws.js";
import type { Env } from "./types.js";

const app = new Hono<Env>();

app.use(sessionMiddleware);
app.use(csrf());

app.route("/", healthRoute);
app.route("/", authRoute);
app.route("/", emailAuthRoute);
app.route("/", testAuthRoute);

app.use("/site-admin/*", requireSiteAdmin);
app.route("/", siteAdminRoute);

app.use("/api/*", requireUser);

app.route("/", channelsRoute);
app.route("/", directMessagesRoute);
app.route("/", messagesRoute);
app.route("/", uploadsRoute);
app.route("/", wsRoute);
app.route("/", indexRoute);

export { app };
