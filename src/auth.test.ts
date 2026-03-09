import { describe, it, expect, beforeAll } from "vitest";
import { hashPassword,checkPasswordHash,makeJWT, validateJWT,getBearerToken } from "./auth.js";
import { Request } from "express";

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
  it("should return false for the uncorrect password", async () => {
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
            validateJWT(invalidToken,secret)
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

describe("Extract and Validate bearer token in the request",()=>{
    const dummyRequest = (bearerToken:string)=> ({
        get(header:string){
            if(header === 'authorization') {
                return 'Bearer ' + bearerToken ;
            }
        }
    } as unknown as Request)

    it("should return the bearer token",()=>{
     const dummyToken = 'this is a dummy JWT token' 
      const request = dummyRequest(dummyToken) ;
      const bearerToken = getBearerToken(request) ;
      expect(bearerToken).toBe(dummyToken)
    })

     it("should throw an error for missing the authorization header",()=>{
        const dummyRequest = (bearerToken:string)=> ({
        get(header:string){
            if(header != 'authorization') {
                return 'Bearer ' + bearerToken ;
            }
            else return undefined ;
        }
    } as unknown as Request) ;

     const dummyToken = 'this is a dummy JWT token' 
      const request = dummyRequest(dummyToken) ;
      expect(()=>{
        getBearerToken(request) ;}).toThrow() ;
    })
    
    
})

