import express from "express";
import config from "./config.js";
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
    res.status(200).send(htmlStr);
}
app.use("/admin/metrics", metricsHandler);
app.post("/admin/reset", (req, res, next) => {
    config.fileserverHits = 0;
    return res.status(200).end();
});
app.use("/app", express.static("./src/app"));
function handlerReadiness(req, res) {
    res.set({ 'Content-Type': 'text/plain', 'charset': 'utf-8' });
    res.status(200).send('OK');
}
app.get("/api/healthz", handlerReadiness);
app.post("/api/validate_chirp", (req, res) => {
    const parsedBody = req.body;
    const profane = ["kerfuffle", "sharbert", "fornax"];
    try {
        if (!parsedBody.body) {
            throw new Error("Invalid JSON");
        }
        if (parsedBody.body.length > 140) {
            throw new Error("Chirp is too long");
        }
        const censuredArray = parsedBody.body.split(" ").map(word => {
            if (profane.includes(word.toLocaleLowerCase())) {
                word = '****';
            }
            return word;
        });
        const censuredBody = censuredArray.join(" ");
        const jsonResponse = { cleanedBody: censuredBody };
        const resBody = JSON.stringify(jsonResponse);
        res.set("Content-Type", "application/json");
        return res.status(200).send(resBody);
    }
    catch (err) {
        if (err instanceof Error) {
            const jsonError = { error: err.message };
            const errorBody = JSON.stringify(jsonError);
            res.set("Content-Type", "application/json");
            return res.status(400).send(errorBody);
        }
        else {
            const jsonError = { error: "Unknown Error" };
            const errorBody = JSON.stringify(jsonError);
            res.set("Content-Type", "application/json");
            return res.status(400).send(errorBody);
        }
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
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
