import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
// Create random Secret key for Authentication
console.log(randomBytes(32).toString("hex"));


// Get the hash from the database and compare it with the raw password
const rawPassword = "Admin1234";
const storedHash = "$2b$12$DjXpMj.Xe5KzklTw.DVc4ey9EDJcRxRWKfAzpBW2M0eAGHiSjJMAG";

bcrypt.compare(rawPassword, storedHash).then(console.log);


// Convert the hash to base64 to store in the database
const hash = "$2b$12$DjXpMj.Xe5KzklTw.DVc4ey9EDJcRxRWKfAzpBW2M0eAGHiSjJMAG";
console.log(Buffer.from(hash).toString("base64"));