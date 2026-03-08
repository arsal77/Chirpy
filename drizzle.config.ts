import { defineConfig } from "drizzle-kit";
process.loadEnvFile() ;

if(!process.env["DB_URL"]){
    throw new Error("Missing URL in the environment variables") ;
}

export default defineConfig({
  schema: "src/db/schema.ts",
  out: "src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env["DB_URL"]
  },
});