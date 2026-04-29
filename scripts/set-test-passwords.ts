import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema.ts";
import { eq } from "drizzle-orm";
import { pbkdf2Sync, randomBytes } from "crypto";

function hashPassword(password: string, salt: string): string {
  return pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
}

function generateSalt(): string {
  return randomBytes(16).toString("hex");
}

async function setPasswords() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);

  const password = "password123";
  const usersToUpdate = [
    "admin@tamam.org",
    "requester1@test.com"
  ];

  console.log(`Setting passwords to "${password}" for: ${usersToUpdate.join(", ")}`);

  try {
    for (const email of usersToUpdate) {
      const salt = generateSalt();
      const hashed = hashPassword(password, salt);
      const passwordHash = `${salt}:${hashed}`;

      await db.update(schema.users)
        .set({ passwordHash: passwordHash, status: 'active' })
        .where(eq(schema.users.email, email));
      
      console.log(`✅ Password set for ${email}`);
    }
  } catch (error) {
    console.error("❌ Failed to update passwords:", error);
  } finally {
    await connection.end();
  }
}

setPasswords();
