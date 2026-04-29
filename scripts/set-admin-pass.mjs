import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema.ts";
import { eq } from "drizzle-orm";

async function setAdminPassword() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);

  const email = "admin@tamam.org";
  const passwordHash = "dde509de033806c224af2a6252a7c36f:0df194c858239bdf95873f1c48e205decc3e2638d05e62e4d33ac710fe571924f0cd7fbdfcf74f0ed4f7554830cddd9785f218e58b63072402266879689fec32";

  console.log(`Setting password for ${email}...`);

  try {
    await db.update(schema.users)
      .set({ passwordHash: passwordHash })
      .where(eq(schema.users.email, email));

    console.log("✅ Admin password updated successfully!");
  } catch (error) {
    console.error("❌ Failed to update admin password:", error);
  } finally {
    await connection.end();
  }
}

setAdminPassword();
