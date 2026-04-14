import { and, eq } from "drizzle-orm";
import { userFeatureFlags } from "../schema.js";
import type { Database } from "./types.js";

type FeatureFlag = { flagKey: string; flagValue: string; grantedBy: string; createdAt: string | null };

export async function getUserFeatureFlag(db: Database, userEmail: string, flagKey: string): Promise<string | null> {
  const [row] = await db
    .select({ flagValue: userFeatureFlags.flagValue })
    .from(userFeatureFlags)
    .where(and(eq(userFeatureFlags.userEmail, userEmail), eq(userFeatureFlags.flagKey, flagKey)));
  return row?.flagValue ?? null;
}

export async function getUserFeatureFlags(db: Database, userEmail: string): Promise<FeatureFlag[]> {
  return db
    .select({
      flagKey: userFeatureFlags.flagKey,
      flagValue: userFeatureFlags.flagValue,
      grantedBy: userFeatureFlags.grantedBy,
      createdAt: userFeatureFlags.createdAt,
    })
    .from(userFeatureFlags)
    .where(eq(userFeatureFlags.userEmail, userEmail));
}

export async function getAllFeatureFlagsGroupedByUser(db: Database): Promise<Map<string, FeatureFlag[]>> {
  const rows = await db
    .select({
      userEmail: userFeatureFlags.userEmail,
      flagKey: userFeatureFlags.flagKey,
      flagValue: userFeatureFlags.flagValue,
      grantedBy: userFeatureFlags.grantedBy,
      createdAt: userFeatureFlags.createdAt,
    })
    .from(userFeatureFlags);

  const grouped = new Map<string, FeatureFlag[]>();
  for (const row of rows) {
    const existing = grouped.get(row.userEmail) ?? [];
    existing.push({
      flagKey: row.flagKey,
      flagValue: row.flagValue,
      grantedBy: row.grantedBy,
      createdAt: row.createdAt,
    });
    grouped.set(row.userEmail, existing);
  }
  return grouped;
}

export async function setUserFeatureFlag(
  db: Database,
  userEmail: string,
  flagKey: string,
  flagValue: string,
  grantedBy: string,
): Promise<void> {
  await db
    .insert(userFeatureFlags)
    .values({ userEmail, flagKey, flagValue, grantedBy })
    .onConflictDoUpdate({
      target: [userFeatureFlags.userEmail, userFeatureFlags.flagKey],
      set: { flagValue, grantedBy },
    });
}

export async function deleteUserFeatureFlag(db: Database, userEmail: string, flagKey: string): Promise<boolean> {
  const deleted = await db
    .delete(userFeatureFlags)
    .where(and(eq(userFeatureFlags.userEmail, userEmail), eq(userFeatureFlags.flagKey, flagKey)))
    .returning();
  return deleted.length > 0;
}
