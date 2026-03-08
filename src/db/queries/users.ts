import { Unauthorized } from "../../error.js";
import { db } from "../index.js";
import { NewUser, users } from "../schema.js";
import { eq } from "drizzle-orm";
import { hashPassword,checkPasswordHash } from "../auth.js";

export async function createUser(email : string,password : string) : Promise<Omit<NewUser,"hashedPassword">> {
  const hashedPassword = await hashPassword(password) ;
  const user : NewUser = {email : email, hashedPassword : hashedPassword} ;
  const [result] = await db.insert(users).values(user).onConflictDoNothing().returning({id:users.id,createdAt:users.createdAt,
    updatedAt : users.updatedAt,email : users.email});
  return result;
}

export async function deleteUsers() {
  await db.delete(users);
}

export async function lookupUser(email : string,password : string) : Promise<Omit<NewUser,"hashedPassword">> {
    try {
const [user] = await db.select().from(users).where(eq(users.email,email)) ;
if(!user) {
    throw new Unauthorized("incorrect email or password") ;
}
const verifyPassword = await checkPasswordHash(password,user.hashedPassword) ;
if(!verifyPassword){
    throw new Unauthorized("incorrect email or password") ;
}

return user ;
    }
catch (err) {
    throw err ;
}
}