import { describe, it, expect, beforeAll } from "vitest";
import { hashPassword,checkPasswordHash,makeJWT, validateJWT } from "./auth.js";

describe("Password Hashing", () => {
  const password1 = "correctPassword123!";
  const password2 = "anotherPassword456!";
  let hash1: string;
  let hash2: string;

  beforeAll(async () => {
    hash1 = await hashPassword(password1);
    hash2 = await hashPassword(password2);
  });

  it("should return true for the correct password", async () => {
    const result = await checkPasswordHash(password1, hash1);
    expect(result).toBe(true);
  });
  it("should return fals for the uncorrect password", async () => {
    const result = await checkPasswordHash(password2, hash1);
    expect(result).toBe(false);
  });
});

describe("JWT Creation and Validation",()=>{
    const UserId = 'hello' ;
    const expiresIn = 1000 ;
    const secret = 'my_super_secret_key_12345';

    it("Should return a string",()=>{
        const token = makeJWT(UserId,expiresIn,secret) ;
        expect(typeof token).toBe('string') ;
    })

    it("Should return valid UserId",()=>{
        const token = makeJWT(UserId,expiresIn,secret) ;
        const tokenUser = validateJWT(token,secret) ;
        expect(tokenUser).toBe(UserId) ;
    }  )

    it("Should return an invalid secret error",()=>{
        const token = makeJWT(UserId,expiresIn,secret) ;
        const invalidSecret = 'invalid_secret'
        expect(()=>{
            validateJWT(token,invalidSecret)
        }).toThrow() ;
    })
    
    it("Should return an invalid token error",()=>{
        const invalidToken = 'invalid_token';
        expect(()=>{
            validateJWT(invalidTokenoken,secret)
        }).toThrow() ;
    })

        it("Should return an expired token error",()=>{
        const expiresIn = 0 ;
        const token = makeJWT(UserId,expiresIn,secret) ;
        expect(()=>{
            validateJWT(token,secret)
        }).toThrow() ;
    })
  
})

