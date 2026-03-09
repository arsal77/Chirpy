import { NotFound,Forbidden } from "../../error.js";
import { db } from "../index.js";
import { NewChirp,chirps} from "../schema.js";
import { asc, desc,eq } from 'drizzle-orm';

export async function createChirp(chirp : NewChirp) {
  const [result] = await db.insert(chirps).values(chirp).onConflictDoNothing().returning();
  return result;
}

export async function selectChirps(userId : string | undefined,sort? : 'asc' | 'desc') {
  try {
  if(!userId) {
  if(sort === 'desc') {
  const result = await db.select().from(chirps).orderBy(desc(chirps.createdAt));
  return result ;
  }
  else {
  const result = await db.select().from(chirps).orderBy(asc(chirps.createdAt));
   return result ;
  }
  }
  if(sort === 'desc') {
  const result = await db.select().from(chirps).where(eq(chirps.userId,userId)).orderBy(desc(chirps.createdAt));
  return result ;
  }
  else {
  const result = await db.select().from(chirps).where(eq(chirps.userId,userId)).orderBy(asc(chirps.createdAt));
  return result ;

  }
}
catch (err) {
  throw err ;
}
}

export async function selectChirp(chirpId : string) {
  try {const [result] = await db.select().from(chirps).where(eq(chirps.id,chirpId));
  if(!result) {
    throw new NotFound("Chirp ID does not exist") ;
  }
  return result;
}

catch (err) {
  throw err ;
}
}

export async function deleteChirpWithValidation(chirpId : string, userId : string) : Promise<void> {
  try {
    const [chirpOwner] = await db.select().from(chirps).where(eq(chirps.id,chirpId))
    if(!chirpOwner) {
      throw new NotFound("Chirp is not found") ;
    }

    if(chirpOwner.userId !== userId) {
      throw new Forbidden("User is not authorized") ;
    }
    await db.delete(chirps).where(eq(chirps.id,chirpId)).returning() ;

  }
  catch (err) {
    throw err ;
  }
}