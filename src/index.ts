import express, { NextFunction,Response,Request } from "express";
import config from "./config.js" ;
import { BadRequest,Unauthorized,Forbidden,NotFound} from "./error.js";

const app = express();
const PORT = 8080;

function middlewareMetricsInc(req: Request, res: Response, next: NextFunction) {
  config.fileserverHits+=1 ;
  next();
}

app.use("/app",middlewareMetricsInc) ;
app.use(express.json()) ;

function metricsHandler(req : Request,res : Response){
 const htmlStr= `<html>
  <body>
    <h1>Welcome, Chirpy Admin</h1>
    <p>Chirpy has been visited ${config.fileserverHits} times!</p>
  </body>
</html>`
res.set('Content-Type','text/html') ;
return res.status(200).send(htmlStr) ;
}

app.use("/admin/metrics",metricsHandler) ;

app.post("/admin/reset",(req: Request, res: Response, next: NextFunction)=>{
    config.fileserverHits = 0;
    return res.status(200).end();
})

app.use("/app",express.static("./src/app"));

function handlerReadiness(req:Request,res:Response) {
res.set({'Content-Type' : 'text/plain','charset' : 'utf-8'}) ;
return res.status(200).send('OK') ;
}

app.get("/api/healthz",handlerReadiness) ;

app.post("/api/validate_chirp",(req:Request,res:Response,next : NextFunction)=>{

    type ValidResponse = {cleanedBody : string} ;
    type ParsedBody = {body : string}
    const parsedBody : ParsedBody = req.body ;
    const profane = ["kerfuffle","sharbert","fornax"] ;
 
        try {
            if(!parsedBody.body) {
                throw new BadRequest("Invalid JSON") ;
            }

            if(parsedBody.body.length>140) {
                throw new BadRequest("Chirp is too long. Max length is 140")
            }

            const censuredArray = parsedBody.body.split(" ").map(word => {
                if(profane.includes(word.toLocaleLowerCase())) {
                 word = '****'
                }
                return word ;
            });

            const censuredBody = censuredArray.join(" ");
            const jsonResponse : ValidResponse = {cleanedBody : censuredBody} ;
            return res.status(200).json(jsonResponse);
            
        }
        catch (err) {
         next(err) ;
        }
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

function errorHandler(err : Error,req : Request,res : Response,next : NextFunction) {
    console.log(err) ;
    if(err instanceof BadRequest || err instanceof Unauthorized || err instanceof Forbidden || err instanceof NotFound){
    return res.status(err.errorCode).json({error: `${err.message}`}) ;
    }
    return console.log("500 - Internal Server Errors");
}

app.use(errorHandler) ;

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
