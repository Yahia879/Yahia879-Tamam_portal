import mysql from "mysql2/promise";
import crypto from "crypto";

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
}

function generateSalt(): string {
  return crypto.randomBytes(16).toString("hex");
}

async function main() {
  const targetEmail = "test9@gmail.com";
  const newPlainPassword = "yahiamo99";

  const conn = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    port: 3306,
  });

  const salt = generateSalt();
  const hashedPassword = hashPassword(newPlainPassword, salt);
  const passwordHash = `${salt}:${hashedPassword}`;

  const dbs = ["test_temam", "tamamgatemanarah_portal"];

  for (const dbName of dbs) {
    try {
      console.log(`\n================ Checking Database: ${dbName} ================`);
      const [users]: any = await conn.query(
        `SELECT id, name, email, role, passwordHash FROM \`${dbName}\`.users WHERE email = ?`,
        [targetEmail]
      );

      if (users.length === 0) {
        // Also check with LIKE just in case
        const [similar]: any = await conn.query(
          `SELECT id, name, email, role FROM \`${dbName}\`.users WHERE email LIKE ?`,
          [`%test9%`]
        );
        console.log(`User '${targetEmail}' not found in ${dbName}. Similar matches:`, similar);
        continue;
      }

      console.log(`Found user in ${dbName}:`, users[0]);

      const [updateResult]: any = await conn.query(
        `UPDATE \`${dbName}\`.users SET passwordHash = ? WHERE id = ?`,
        [passwordHash, users[0].id]
      );

      console.log(`Update result for ${dbName}: affectedRows = ${updateResult.affectedRows}`);

      const [verified]: any = await conn.query(
        `SELECT id, name, email, role, passwordHash FROM \`${dbName}\`.users WHERE id = ?`,
        [users[0].id]
      );
      console.log(`Verified user in ${dbName}:`, verified[0]);

      // Double-check verification
      const [vSalt, vHash] = verified[0].passwordHash.split(":");
      const testHash = hashPassword(newPlainPassword, vSalt);
      const isMatch = testHash === vHash;
      console.log(`Password verification test for ${verified[0].email} in ${dbName}: ${isMatch ? "SUCCESS ✅" : "FAILED ❌"}`);
    } catch (err: any) {
      console.error(`Error in ${dbName}:`, err.message);
    }
  }

  await conn.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
