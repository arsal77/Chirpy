import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { NotFound, Unauthorized } from "./error.js";
import { randomBytes } from "node:crypto";
import { db } from "./db/index.js";
import { refresh_tokens } from "./db/schema.js";
import { eq } from "drizzle-orm";
import config from "./config.js";
export async function hashPassword(password) {
    try {
        const hashedPassword = await argon2.hash(password);
        return hashedPassword;
    }
    catch (err) {
        throw err;
    }
}
export async function checkPasswordHash(password, hash) {
    try {
        const verifyPassword = await argon2.verify(hash, password);
        return verifyPassword;
    }
    catch (err) {
        throw err;
    }
}
export function makeJWT(userID, expiresIn, secret) {
    const currTime = Math.floor(Date.now() / 1000);
    const jwtPayload = { iss: "chirpy", sub: userID, iat: currTime, exp: currTime + expiresIn };
    return jwt.sign(jwtPayload, secret);
}
export function validateJWT(tokenString, secret) {
    try {
        const user = jwt.verify(tokenString, secret);
        if (!user.sub) {
            throw new Unauthorized("Invalid token");
        }
        return user.sub.toString();
    }
    catch (err) {
        throw new Unauthorized("Invalid token");
    }
}
export function getBearerToken(req) {
    const bearerToken = req.get('authorization')?.replace('Bearer ', '');
    if (!bearerToken) {
        throw new Unauthorized("Authorization header is not present");
    }
    return bearerToken;
}
export async function makeRefreshToken(userId) {
    try {
        const token = randomBytes(256).toString('hex');
        if (!token) {
            throw new Error("Internal Server Error");
        }
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 60);
        const newToken = { token: token, userId: userId, expiresAt: expiresAt };
        await db.insert(refresh_tokens).values(newToken);
        return token;
    }
    catch (err) {
        throw err;
    }
}
export async function getAccessTokenFromRefreshToken(tokenId) {
    try {
        const [refreshToken] = await db.select().from(refresh_tokens).where(eq(refresh_tokens.token, tokenId));
        const currDate = new Date();
        if (!refreshToken || refreshToken.expiresAt < currDate || refreshToken.revokedAt !== null) {
            throw new Unauthorized("Invalid token");
        }
        return makeJWT(refreshToken.userId, 3600, config.secret);
    }
    catch (err) {
        throw err;
    }
}
export async function revokeRefreshToken(tokenId) {
    try {
        const currDate = new Date();
        const [revokedToken] = await db.update(refresh_tokens).set({ revokedAt: currDate }).where(eq(refresh_tokens.token, tokenId)).returning();
        if (!revokedToken) {
            throw new NotFound("The token is not found");
        }
    }
    catch (err) {
        throw err;
    }
}
export function getAPIKey(req) {
    const bearerToken = req.get('authorization')?.replace('ApiKey ', '');
    if (!bearerToken) {
        throw new Unauthorized("Authorization header is not present");
    }
    return bearerToken;
}
