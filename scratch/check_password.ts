import dotenv from "dotenv";
dotenv.config();
import mysql from "mysql2/promise";
import crypto from "crypto";
import bcrypt from "bcryptjs";

function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false;

  // Format: salt:hash (PBKDF2)
  if (storedHash.includes(":")) {
    const [salt, hash] = storedHash.split(":");
    const computedHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
    if (computedHash === hash) return true;
  }

  // Bcrypt format
  if (storedHash.startsWith("$2a$") || storedHash.startsWith("$2b$")) {
    if (bcrypt.compareSync(password, storedHash)) return true;
  }

  return false;
}

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const [rows]: any = await conn.query("SELECT id, name, email, passwordHash FROM users WHERE email = 'solayani@manarah.org.sa'");
  await conn.end();

  if (rows.length === 0) {
    console.log("User not found!");
    return;
  }

  const user = rows[0];
  console.log(`Found user: ${user.name} (${user.email})`);
  console.log(`Stored Hash: ${user.passwordHash}`);

  const candidates = [
    "123456",
    "password123",
    "admin123",
    "Admin@123456",
    "12345678",
    "manarah123",
    "solayani123",
    "tamam123",
    "123456789"
  ];

  for (const pwd of candidates) {
    if (verifyPassword(pwd, user.passwordHash)) {
      console.log(`\n✅ MATCH FOUND! Password is: "${pwd}"`);
      return;
    }
  }

  console.log("\n❌ No candidate matched.");
}

main().catch(console.error);
