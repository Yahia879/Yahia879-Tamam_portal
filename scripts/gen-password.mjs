import { pbkdf2Sync, randomBytes } from "crypto";

function hashPassword(password, salt) {
  return pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
}

function generateSalt() {
  return randomBytes(16).toString("hex");
}

const password = "admin123";
const salt = generateSalt();
const hash = hashPassword(password, salt);
console.log(`${salt}:${hash}`);
