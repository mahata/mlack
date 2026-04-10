import type { Context } from "hono";
import type { Env, Workspace } from "../types.js";

export function getWorkspace(c: Context<Env>): Workspace {
  const workspace = c.get("workspace");
  if (!workspace) {
    throw new Error("Workspace not found in context — is requireWorkspaceMember middleware applied?");
  }
  return workspace;
}
