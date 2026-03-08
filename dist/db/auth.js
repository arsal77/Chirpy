import argon2 from "argon2";
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
