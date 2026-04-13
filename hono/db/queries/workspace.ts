import { and, eq } from "drizzle-orm";
import { workspaceMembers } from "../schema.js";
import type { Database } from "./types.js";

export async function getWorkspaceMember(db: Database, workspaceId: number, userEmail: string) {
  const [member] = await db
    .select()
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userEmail, userEmail)));
  return member ?? null;
}
