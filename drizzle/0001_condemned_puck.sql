CREATE TABLE "commit" (
	"id" text PRIMARY KEY NOT NULL,
	"commitSha" text NOT NULL,
	"repositoryName" text NOT NULL,
	"date" timestamp NOT NULL,
	"summary" text DEFAULT '',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
