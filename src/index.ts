import express, { NextFunction,Response,Request } from "express";
import config from "./config.js" ;
import { BadRequest,Unauthorized,Forbidden,NotFound} from "./error.js";
import postgres from "postgres";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import { createUser,deleteUsers,lookupUser,updateUserDetails,updateUserToChirpyRed } from "./db/queries/users.js";
import { NewChirp,SelectChirp } from "./db/schema.js";
import { createChirp,selectChirps,selectChirp,deleteChirpWithValidation } from "./db/queries/chirps.js";
import { getBearerToken,makeJWT,validateJWT,makeRefreshToken,getAccessTokenFromRefreshToken,revokeRefreshToken, hashPassword, getAPIKey } from "./auth.js";


const migrationClient = postgres(config.db.url, { max: 1 });
await migrate(drizzle(migrationClient), config.db.migrationConfig);
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

app.post("/admin/reset",async (req: Request, res: Response, next: NextFunction)=>{
    config.fileserverHits = 0;
    try {
    if(!(config.PLATFORM==="dev")) {
        throw new Forbidden("Forbidden to reset the API") ;
    }
    await deleteUsers() ;
    return res.status(200).end();
    }
    catch (err) {
        next(err) ;
    }
})

app.use("/app",express.static("./src/app"));

function handlerReadiness(req:Request,res:Response) {
res.set({'Content-Type' : 'text/plain','charset' : 'utf-8'}) ;
return res.status(200).send('OK') ;
}

app.get("/api/healthz",handlerReadiness) ;



app.post("/api/users",async (req : Request,res : Response,next:NextFunction)=>{
try {
    type ReqBody = {
        email : string,
        password : string
    }
    const reqBody : ReqBody = req.body ;
    if(!reqBody.email) {
        throw new BadRequest("Email is not provided") ;
    }
    if(!reqBody.password) {
        throw new BadRequest("Password is not provided") ;
    }
   
    const createdUser = await createUser(reqBody.email,reqBody.password) ;
    return res.status(201).json(createdUser) ;
}
catch (err) {
    next(err) ;
}
})

app.put("/api/users",async (req : Request, res : Response, next : NextFunction)=>{
    try {
    type ParsedBody = {password : string, email : string} ;
    const parsedBody : ParsedBody = req.body ;
    if(!parsedBody.email || !parsedBody.password) {
        throw new BadRequest("email or password is not provided")
    }
    const token = getBearerToken(req) ;
    const userId = validateJWT(token,config.secret) ;
    const hashedPassword = await hashPassword(parsedBody.password) ;
    const updatedUser = await updateUserDetails(userId,parsedBody.email,hashedPassword) ;
    return res.status(200).json(updatedUser) ;
    }
    catch (err) {
        next(err) ;
    }
})

app.post("/api/chirps",async (req : Request, res : Response, next : NextFunction)=>{
    type ParsedBody = {body : string} ;
    const parsedBody : ParsedBody = req.body ;
    const profane = ["kerfuffle","sharbert","fornax"] ;
 
        try {
            const bearerToken = getBearerToken(req) ;
            const userId = validateJWT(bearerToken,config.secret) ;
            if(!parsedBody.body) {
                throw new BadRequest("Invalid JSON. Missing the chirp") ;
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

            const censuredChirp = censuredArray.join(" ");
            const newChirp : NewChirp = {userId : userId, body : censuredChirp} ;
            const insertedChirp : SelectChirp = await createChirp(newChirp) ;
            return res.status(201).json(insertedChirp);
            
        }
        catch (err) {
         next(err) ;
        }
})

app.get("/api/chirps",async (req : Request,res : Response, next : NextFunction)=>{
    try {
    let authorId = "";
    let authorIdQuery = req.query.authorId;
    if (typeof authorIdQuery === "string") {
    authorId = authorIdQuery;
    }
    type Sort = "asc" | "desc" ;
    let sort : Sort = "asc";
    let sortQuery = req.query.sort;
    if (sortQuery === "desc") {
    sort = sortQuery;
    }
    const allChirps = await selectChirps(authorId,sort) ;
    return res.status(200).json(allChirps) ;
    }
    catch (err) {
        next(err) ;
    }
})

app.get("/api/chirps/:chirpId",async (req : Request,res : Response,next : NextFunction)=>{
try {
    let chirpId = req.params.chirpId ;
    if(Array.isArray(chirpId)) {
     chirpId = chirpId[0] ;
    }
    if(!chirpId) {
        throw new BadRequest("Request is missing the chirp id") ;
    }
    const chirp : SelectChirp= await selectChirp(chirpId) ;
    res.status(200).json(chirp) ;
}
catch (err) {
    next(err) ;
}
})

app.post("/api/login",async (req : Request, res : Response, next : NextFunction)=>{
    try {
        type ParsedBody = {email : string, password : string} ;
        const parsedBody : ParsedBody = req.body ;
        if(!parsedBody.email) {
                throw new BadRequest("Invalid JSON. Missing the email") ;
            }
        if(!parsedBody.password) {
                throw new BadRequest("Invalid JSON. Missing the password") ;
            }
        
        const user = await lookupUser(parsedBody.email,parsedBody.password) ;
        if(!user.id) {
            throw new NotFound("User doesn't exist") ;
        }
        const token = makeJWT(user.id,3600,config.secret) ;
        const refreshToken = await makeRefreshToken(user.id) ;
        return res.status(200).json({...user,token,refreshToken}) ;

    }
    catch (err) {
        next(err) ;
    }
})

app.use("/api/refresh",async (req:Request,res:Response,next:NextFunction)=>{
    try {
    const refreshToken = getBearerToken(req) ;
    const token = await getAccessTokenFromRefreshToken(refreshToken) ;
    return res.status(200).json({token}) ;
    }
    catch (err) {
        next(err) ;
    }
})

app.use("/api/revoke",async (req:Request,res:Response,next:NextFunction)=>{
    try {
    const refreshToken = getBearerToken(req) ;
    await revokeRefreshToken(refreshToken) ;
    return res.status(204).end() ;
    }
    catch (err) {
        next(err) ;
    }
})

app.delete("/api/chirps/:chirpid",async (req:Request,res:Response,next:NextFunction)=>{
try {
    let chirpId = req.params.chirpid ;
    if(Array.isArray(chirpId)) {
        chirpId = chirpId[0] ;
    }
    const token = getBearerToken(req) ;
    const user = validateJWT(token,config.secret) ;
    await deleteChirpWithValidation(chirpId,user) ;
    return res.status(204).end() ;
}
catch (err) {
    next(err) ;
}
})

app.post("/api/polka/webhooks",async (req:Request,res:Response,next:NextFunction)=>{
    try {
    type ParsedBody = {
        event : string ,
        data : {
            userId : string
        }
    }
    const parsedBody : ParsedBody = req.body ;
    const apiKey = getAPIKey(req) ;
    if(apiKey !== config.polkaKey) {
        throw new Unauthorized("Not authorized") ;
    }
    if(parsedBody.event !== "user.upgraded") {
    return res.status(204).end() ;
    }
    if(!parsedBody.data.userId) {
    throw new BadRequest("user ID not provided") ;
    }

    await updateUserToChirpyRed(parsedBody.data.userId) ;
    return res.status(204).end() ;
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
    console.log(err);
    return res.end(500) ;
}

app.use(errorHandler) ;

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
