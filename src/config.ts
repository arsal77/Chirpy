import type { MigrationConfig } from "drizzle-orm/migrator";

const migrationConfig: MigrationConfig = {
  migrationsFolder: "./src/db/migrations",
};
process.loadEnvFile() ;

function envOrThrow(key:string ) {
  if(!process.env[key]) {
      throw new Error(`Missing ${key} in the environment variables`) ;

  }
  return process.env[key] ;
}

const dbURL = envOrThrow('DB_URL') ;
const platform = envOrThrow('PLATFORM') ;

type DBConfig = {
  db : {url : string,
  migrationConfig : MigrationConfig}
}


type APIConfig = {
  fileserverHits: number;
  PLATFORM : string
};


const config : APIConfig & DBConfig = {
  fileserverHits : 0,
  PLATFORM : platform,
  db : {url : dbURL,
  migrationConfig : migrationConfig
 } };

export default config ;