import dotenv from "dotenv";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

dotenv.config();

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const [users] = await conn.query("SELECT id, name, email, role, status, passwordHash FROM users WHERE name LIKE '%Yahia%' OR email LIKE '%yahia%'");
  console.log("Users found:", users);
  
  if (users.length > 0) {
    const user = users[0];
    const isPassValid = await bcrypt.compare("yahiamo991122", user.passwordHash || "");
    console.log("Password valid for yahiamo991122:", isPassValid);
    if (!isPassValid) {
      const newHash = await bcrypt.hash("yahiamo991122", 10);
      await conn.query("UPDATE users SET passwordHash = ? WHERE id = ?", [newHash, user.id]);
      console.log("Updated password hash for user Yahia879 successfully!");
    }
  }
  await conn.end();
}

main().catch(console.error);
