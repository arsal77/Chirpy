ALTER TABLE "refresh_tokens" ALTER COLUMN "token" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ALTER COLUMN "token" DROP DEFAULT;