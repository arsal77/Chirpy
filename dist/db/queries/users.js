import { Unauthorized, NotFound } from "../../error.js";
import { db } from "../index.js";
import { users } from "../schema.js";
import { eq } from "drizzle-orm";
import { hashPassword, checkPasswordHash } from "../../auth.js";
export async function createUser(email, password) {
    const hashedPasswordVal = await hashPassword(password);
    const user = { email: email, hashedPassword: hashedPasswordVal };
    const [result] = await db.insert(users).values(user).onConflictDoNothing().returning();
    const { hashedPassword, ...safeUser } = result;
    return safeUser;
}
export async function deleteUsers() {
    await db.delete(users);
}
export async function lookupUser(email, password) {
    try {
        const [user] = await db.select().from(users).where(eq(users.email, email));
        if (!user) {
            throw new Unauthorized("incorrect email or password");
        }
        const verifyPassword = await checkPasswordHash(password, user.hashedPassword);
        if (!verifyPassword) {
            throw new Unauthorized("incorrect email or password");
        }
        const { hashedPassword, ...safeUser } = user;
        return safeUser;
    }
    catch (err) {
        throw err;
    }
}
export async function updateUserDetails(userId, email, hashPassword) {
    try {
        const [updatedUser] = await db.update(users).set({ email: email, hashedPassword: hashPassword }).where(eq(users.id, userId)).returning();
        if (!updatedUser) {
            throw new NotFound("The user is not found");
        }
        const { hashedPassword, ...safeUser } = updatedUser;
        return safeUser;
    }
    catch (err) {
        throw err;
    }
}
export async function updateUserToChirpyRed(userId) {
    try {
        const [upgradedUser] = await db.update(users).set({ isChirpyRed: true }).where(eq(users.id, userId)).returning();
        if (!upgradedUser) {
            throw new NotFound("User not found");
        }
    }
    catch (err) {
        throw err;
    }
}
