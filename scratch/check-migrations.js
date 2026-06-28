import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    const [tables] = await connection.query("SHOW TABLES");
    console.log("Tables in database:", tables.map(t => Object.values(t)[0]));

    // Check if __drizzle_migrations exists
    const [hasMigTable] = await connection.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '__drizzle_migrations'`
    );
    if (hasMigTable.length > 0) {
      const [migrations] = await connection.query("SELECT * FROM `__drizzle_migrations` ORDER BY id ASC");
      console.log("Applied migrations in DB:", migrations);
    } else {
      console.log("__drizzle_migrations table does not exist.");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
