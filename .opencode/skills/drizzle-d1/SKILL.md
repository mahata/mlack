---
name: drizzle-d1
description: Load this skill when working on database schema, migrations, queries, or Drizzle ORM with D1
---

# Drizzle ORM + D1 Patterns for mlack

## Schema Definition

Schema is defined in `hono/db/schema.ts` using Drizzle's SQLite schema builders:

```ts
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  picture: text("picture"),
  passwordHash: text("password_hash"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
```

## Database Connection

```ts
import { drizzle } from "drizzle-orm/d1";

// In a route handler:
const db = drizzle(c.env.DB);
```

## Query Patterns

### Select
```ts
const allUsers = await db.select().from(users);
const user = await db.select().from(users).where(eq(users.email, email));
```

### Insert
```ts
await db.insert(users).values({ email, name, picture });
```

### Update
```ts
await db.update(users).set({ name: newName }).where(eq(users.id, id));
```

### Delete
```ts
await db.delete(users).where(eq(users.id, id));
```

## Migrations Workflow

1. Edit `hono/db/schema.ts`
2. Generate migration: `pnpm db:generate`
3. Review the generated SQL in `hono/db/migrations/`
4. Apply locally: `pnpm db:migrate`
5. Apply to production: `pnpm db:migrate:prod`

## D1/SQLite Type Mapping

| Concept       | Drizzle Type | SQLite Storage | Notes |
|---------------|-------------|----------------|-------|
| String        | `text()`    | TEXT           | |
| Integer       | `integer()` | INTEGER        | |
| Boolean       | `integer({ mode: "boolean" })` | INTEGER (0/1) | SQLite has no native boolean |
| Timestamp     | `text()`    | TEXT (ISO 8601) | Or `integer()` for Unix timestamps |
| Primary Key   | `.primaryKey({ autoIncrement: true })` | INTEGER | |
| Foreign Key   | `.references(() => otherTable.id)` | INTEGER | |

## Common Pitfalls

1. **Always use `eq()`, `and()`, `or()`** from `drizzle-orm` for WHERE clauses — don't concatenate strings
2. **D1 has no ALTER COLUMN** — To change a column type, you must create a new table, copy data, drop old, rename
3. **No concurrent writes** — D1 serializes writes per database. Design accordingly
4. **Row size limit** — D1 rows are limited to 1MB (including all columns)
5. **Always add `.limit()`** on SELECT queries that could return many rows
6. **Use transactions** for multi-step writes: `await db.batch([...])`
