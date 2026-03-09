const migrationConfig = {
    migrationsFolder: "./src/db/migrations",
};
process.loadEnvFile();
function envOrThrow(key) {
    if (!process.env[key]) {
        throw new Error(`Missing ${key} in the environment variables`);
    }
    return process.env[key];
}
const dbURL = envOrThrow('DB_URL');
const platform = envOrThrow('PLATFORM');
const secret = envOrThrow('SECRET');
const polkaKey = envOrThrow('POLKA_KEY');
const config = {
    fileserverHits: 0,
    PLATFORM: platform,
    secret: secret,
    polkaKey: polkaKey,
    db: { url: dbURL,
        migrationConfig: migrationConfig,
    }
};
export default config;
