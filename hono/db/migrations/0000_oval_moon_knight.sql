CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"user_email" varchar(255) NOT NULL,
	"user_name" varchar(255),
	"created_at" timestamp DEFAULT now()
);
