import { NextRequest } from "next/server";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

// CSRF (Cross-Site Request Forgery) tokens protect against unauthorized actions by ensuring the request came from the same site
// Goals: Ensure requests originate from your site and not from a malicious site
const secret = new TextEncoder().encode(process.env.CSRF_SECRET || "default_csrf_secret");
// Generate a short-lived CSRF token signed with your secret key
export async function generateCsrfToken(payload: JWTPayload = {}) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m") // token expires in 10 minutes
    .sign(secret);
}
// Validate an incoming CSRF token by verifying its signature and expiration
export async function validateCsrfToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (err) {
    return err; // return null if token is invalid or expired
  }
}
// Extract CSRF token from custom header in the request
export function extractCsrfHeader(req: NextRequest) {
  return req.headers.get("x-csrf-token") || "";
}