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

export async function getChannelById(db: Database, channelId: number) {
  const [channel] = await db.select().from(channels).where(eq(channels.id, channelId));
  return channel ?? null;
}

export async function getChannelByName(db: Database, name: string) {
  const [channel] = await db.select().from(channels).where(eq(channels.name, name));
  return channel ?? null;
}

export async function insertChannelMember(db: Database, channelId: number, userEmail: string): Promise<void> {
  await db.insert(channelMembers).values({ channelId, userEmail }).onConflictDoNothing();
}

export async function getChannelMemberEmails(db: Database, channelId: number): Promise<string[]> {
  const members = await db.select().from(channelMembers).where(eq(channelMembers.channelId, channelId));
  return members.map((m) => m.userEmail);
}

export async function ensureGeneralChannelMembership(db: Database, userEmail: string): Promise<void> {
  const generalChannel = await getChannelByName(db, "general");
  if (!generalChannel) return;

  const alreadyMember = await isChannelMember(db, generalChannel.id, userEmail);
  if (!alreadyMember) {
    await insertChannelMember(db, generalChannel.id, userEmail);
  }
}
