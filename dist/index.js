import express from "express";
import config from "./config.js";
import { BadRequest, Unauthorized, Forbidden, NotFound } from "./error.js";
import postgres from "postgres";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import { createUser, deleteUsers } from "./db/queries/users.js";
import { createChirp, selectChirps, selectChirp } from "./db/queries/chirps.js";
const migrationClient = postgres(config.db.url, { max: 1 });
await migrate(drizzle(migrationClient), config.db.migrationConfig);
const app = express();
const PORT = 8080;
function middlewareMetricsInc(req, res, next) {
    config.fileserverHits += 1;
    next();
}
app.use("/app", middlewareMetricsInc);
app.use(express.json());
function metricsHandler(req, res) {
    const htmlStr = `<html>
  <body>
    <h1>Welcome, Chirpy Admin</h1>
    <p>Chirpy has been visited ${config.fileserverHits} times!</p>
  </body>
</html>`;
    res.set('Content-Type', 'text/html');
    return res.status(200).send(htmlStr);
}
app.use("/admin/metrics", metricsHandler);
app.post("/admin/reset", async (req, res, next) => {
    config.fileserverHits = 0;
    try {
        if (!(config.PLATFORM === "dev")) {
            throw new Forbidden("Forbidden to reset the API");
        }
        await deleteUsers();
        return res.status(200).end();
    }
    catch (err) {
        next(err);
    }
});
app.use("/app", express.static("./src/app"));
function handlerReadiness(req, res) {
    res.set({ 'Content-Type': 'text/plain', 'charset': 'utf-8' });
    return res.status(200).send('OK');
}
app.get("/api/healthz", handlerReadiness);
app.post("/api/users", async (req, res, next) => {
    try {
        const reqBody = req.body;
        if (!reqBody.email) {
            throw new BadRequest("Email is not provided");
        }
        const newUser = {
            email: req.body.email
        };
        const createdUser = await createUser(newUser);
        return res.status(201).json(createdUser);
    }
    catch (err) {
        next(err);
    }
});
app.post("/api/chirps", async (req, res, next) => {
    const parsedBody = req.body;
    const profane = ["kerfuffle", "sharbert", "fornax"];
    try {
        if (!parsedBody.body) {
            throw new BadRequest("Invalid JSON. Missing the chirp");
        }
        if (!parsedBody.userId) {
            throw new BadRequest("Invalid JSON. Missing the userId");
        }
        if (parsedBody.body.length > 140) {
            throw new BadRequest("Chirp is too long. Max length is 140");
        }
        const censuredArray = parsedBody.body.split(" ").map(word => {
            if (profane.includes(word.toLocaleLowerCase())) {
                word = '****';
            }
            return word;
        });
        const censuredChirp = censuredArray.join(" ");
        const newChirp = { userId: parsedBody.userId, body: censuredChirp };
        const insertedChirp = await createChirp(newChirp);
        return res.status(201).json(insertedChirp);
    }
    catch (err) {
        next(err);
    }
});
app.get("/api/chirps", async (req, res, next) => {
    try {
        const allChirps = await selectChirps();
        return res.status(200).json(allChirps);
    }
    catch (err) {
        next(err);
    }
});
app.get("/api/chirps/:chirpId", async (req, res, next) => {
    try {
        let chirpId = req.params.chirpId;
        if (Array.isArray(chirpId)) {
            chirpId = chirpId[0];
        }
        if (!chirpId) {
            throw new BadRequest("Request is missing the chirp id");
        }
        const chirp = await selectChirp(chirpId);
        res.status(200).json(chirp);
    }
    catch (err) {
        next(err);
    }
});
function middlewareLogResponses(req, res, next) {
    res.on("finish", () => {
        const statusCode = res.statusCode;
        if (statusCode < 200 || statusCode >= 300) {
            console.log(`[NON-OK] ${req.method} ${req.url} - Status: ${statusCode}`);
        }
    });
    next();
}
app.use(middlewareLogResponses);
function errorHandler(err, req, res, next) {
    console.log(err);
    if (err instanceof BadRequest || err instanceof Unauthorized || err instanceof Forbidden || err instanceof NotFound) {
        return res.status(err.errorCode).json({ error: `${err.message}` });
    }
    console.log(err);
    return res.end(500);
}
app.use(errorHandler);
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
