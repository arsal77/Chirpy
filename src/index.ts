import express, { NextFunction,Response,Request } from "express";
import config from "./config.js" ;
import { nextTick } from "node:process";

const app = express();
const PORT = 8080;

function middlewareMetricsInc(req: Request, res: Response, next: NextFunction) {
  config.fileserverHits+=1 ;
  next();
}

app.use("/app",middlewareMetricsInc) ;

function metricsHandler(req : Request,res : Response){
 const htmlStr= `<html>
  <body>
    <h1>Welcome, Chirpy Admin</h1>
    <p>Chirpy has been visited ${config.fileserverHits} times!</p>
  </body>
</html>`
res.set('Content-Type','text/html') ;
res.status(200).send(htmlStr) ;
}

app.use("/admin/metrics",metricsHandler) ;

app.post("/admin/reset",(req: Request, res: Response, next: NextFunction)=>{
    config.fileserverHits = 0;
    return res.status(200).end();
})

app.use("/app",express.static("./src/app"));

function handlerReadiness(req:Request,res:Response) {
res.set({'Content-Type' : 'text/plain','charset' : 'utf-8'}) ;
res.status(200).send('OK') ;
}

app.get("/api/healthz",handlerReadiness) ;

app.post("/api/validate_chirp",(req:Request,res:Response)=>{
    let body = ""
    type ValidResponse = {valid : true} ;
    type ErrorResponse = {error : string} ;
    req.on("data",(chunk)=>{
        body+=chunk ;
    }) ;
    req.on("end",()=>{
        try {
            type ParsedChirp = {
            body : string 
        }
            const parsedBody : ParsedChirp = JSON.parse(body) ;
            if(parsedBody.body.length>140) {
                throw new Error("Chirp is too long")
            }
            const jsonResponse : ValidResponse = {valid : true} ;
            const resBody = JSON.stringify(jsonResponse) ;
            res.set("Content-Type", "application/json");
            return res.status(200).send(resBody);
            
        }
        catch (err) {
            if (err instanceof Error) {
            const jsonError : ErrorResponse = {error : err.message} ;
            const errorBody = JSON.stringify(jsonError) ;
            res.set("Content-Type", "application/json");
            return res.status(400).send(errorBody);
            }
            else {
            const jsonError : ErrorResponse = {error : "Unknown Error"} ;
            const errorBody = JSON.stringify(jsonError) ;
            res.set("Content-Type", "application/json");
            return res.status(400).send(errorBody);

            }
        }

        
        

    })
})

function middlewareLogResponses(req:Request,res:Response,next:NextFunction) {
res.on("finish",()=>{
    const statusCode = res.statusCode;
    if (statusCode<200 || statusCode>=300){
        console.log(`[NON-OK] ${req.method} ${req.url} - Status: ${statusCode}`) ;
    }
})
next() ;
}

app.use(middlewareLogResponses) ;

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});