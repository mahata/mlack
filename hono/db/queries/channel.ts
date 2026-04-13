import { and, eq } from "drizzle-orm";
import { channelMembers, channels } from "../schema.js";
import type { Database } from "./types.js";

export async function isChannelMember(db: Database, channelId: number, userEmail: string): Promise<boolean> {
  const membership = await db
    .select()
    .from(channelMembers)
    .where(and(eq(channelMembers.channelId, channelId), eq(channelMembers.userEmail, userEmail)));
  return membership.length > 0;
}

export async function getChannelInWorkspace(db: Database, channelId: number, workspaceId: number) {
  const [channel] = await db
    .select()
    .from(channels)
    .where(and(eq(channels.id, channelId), eq(channels.workspaceId, workspaceId)));
  return channel ?? null;
}

export async function getChannelByNameInWorkspace(db: Database, workspaceId: number, name: string) {
  const [channel] = await db
    .select()
    .from(channels)
    .where(and(eq(channels.workspaceId, workspaceId), eq(channels.name, name)));
  return channel ?? null;
}

export async function insertChannelMember(db: Database, channelId: number, userEmail: string): Promise<void> {
  await db.insert(channelMembers).values({ channelId, userEmail }).onConflictDoNothing();
}

export async function getChannelMemberEmails(db: Database, channelId: number): Promise<string[]> {
  const members = await db.select().from(channelMembers).where(eq(channelMembers.channelId, channelId));
  return members.map((m) => m.userEmail);
}

export async function ensureGeneralChannelMembership(
  db: Database,
  workspaceId: number,
  userEmail: string,
): Promise<void> {
  const generalChannel = await getChannelByNameInWorkspace(db, workspaceId, "general");
  if (!generalChannel) return;

  const alreadyMember = await isChannelMember(db, generalChannel.id, userEmail);
  if (!alreadyMember) {
    await insertChannelMember(db, generalChannel.id, userEmail);
  }
}
