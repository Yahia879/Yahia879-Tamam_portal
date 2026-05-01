import { pbkdf2Sync, randomBytes } from "crypto";
import mysql from 'mysql2/promise';
import 'dotenv/config';

function hashPassword(password, salt) {
  return pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
}

function generateSalt() {
  return randomBytes(16).toString("hex");
}

async function restoreUsers() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    const usersToCreate = [
      {
        email: "admin@tamam.sa",
        name: "مدير النظام",
        phone: "0500000000",
        password: "Admin@123456",
        role: "super_admin",
      },
      {
        email: "user@tamam.sa",
        name: "مستفيد تجريبي",
        phone: "0523456523",
        password: "12345678",
        role: "service_requester",
      }
    ];

    for (const userData of usersToCreate) {
      const salt = generateSalt();
      const passwordHash = `${salt}:${hashPassword(userData.password, salt)}`;
      
      // Check if user exists
      const [existing] = await connection.execute(
        'SELECT id FROM users WHERE email = ? OR phone = ?',
        [userData.email, userData.phone]
      );

      if (existing.length > 0) {
        console.log(`Updating existing user: ${userData.email} / ${userData.phone}`);
        await connection.execute(
          'UPDATE users SET passwordHash = ?, role = ?, status = "active" WHERE id = ?',
          [passwordHash, userData.role, existing[0].id]
        );
      } else {
        console.log(`Creating new user: ${userData.email} / ${userData.phone}`);
        await connection.execute(
          'INSERT INTO users (email, passwordHash, name, phone, role, status, lastSignedIn) VALUES (?, ?, ?, ?, ?, "active", NOW())',
          [userData.email, passwordHash, userData.name, userData.phone, userData.role]
        );
      }
    }
    console.log("✅ Users restored successfully!");
  } catch (error) {
    console.error("❌ Error restoring users:", error);
  } finally {
    await connection.end();
  }
}

restoreUsers();
