import dotenv from "dotenv";
dotenv.config();
import mysql from "mysql2/promise";

async function addMetaTitleColumn() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return;
  const conn = await mysql.createConnection(dbUrl);

  try {
    const [cols]: any = await conn.query("SHOW COLUMNS FROM organization_settings LIKE 'metaTitle'");
    if (cols.length === 0) {
      console.log("Adding metaTitle column to organization_settings table...");
      await conn.query("ALTER TABLE organization_settings ADD COLUMN metaTitle VARCHAR(255) NULL");
      console.log("Column metaTitle added successfully!");
    } else {
      console.log("Column metaTitle already exists in organization_settings table.");
    }
  } catch (err) {
    console.error("Error checking/adding column:", err);
  } finally {
    await conn.end();
  }
}

addMetaTitleColumn().catch(console.error);
