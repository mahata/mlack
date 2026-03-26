CREATE TABLE "channels" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_by_email" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "channels_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "channel_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"channel_id" integer NOT NULL,
	"user_email" varchar(255) NOT NULL,
	"joined_at" timestamp DEFAULT now(),
	CONSTRAINT "channel_members_channel_id_user_email_unique" UNIQUE("channel_id","user_email")
);
--> statement-breakpoint
ALTER TABLE "channel_members" ADD CONSTRAINT "channel_members_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "channels" ("name", "created_by_email") VALUES ('general', 'system');
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "channel_id" integer;
--> statement-breakpoint
UPDATE "messages" SET "channel_id" = (SELECT "id" FROM "channels" WHERE "name" = 'general');
--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "channel_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;
