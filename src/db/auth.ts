
import argon2  from "argon2";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
import { Unauthorized } from "src/error";

export async function  hashPassword(password: string): Promise<string> {
try {
    const hashedPassword = await argon2.hash(password) ;
    return hashedPassword ;
}
catch (err) {
    throw err ;
}
}

export async function  checkPasswordHash(password: string,hash : string): Promise<boolean> {
try {
    const verifyPassword = await argon2.verify(hash,password) ;
    return verifyPassword;
}
catch (err) {
    throw err ;
}
}

function makeJWT(userID: string, expiresIn: number, secret: string): string {
    type payload = Pick<JwtPayload, "iss" | "sub" | "iat" | "exp">;
    const currTime = Math.floor(Date.now() / 1000) ;
    const jwtPayload : payload = {iss : "chirpy",sub : userID, iat: currTime, exp : currTime+expiresIn} ;
    return jwt.sign(jwtPayload,secret) ;
   
}

function validateJWT(tokenString: string, secret: string): string {
    try {
    const user = jwt.verify(tokenString,secret) ;
    if(!user.sub) {
        throw new Unauthorized("Invalid token") ;
    }
    return user.sub.toString() ;
}
catch (err) {
  throw new Unauthorized("Invalid token") ;

}
}

