import "dotenv/config";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL || "mysql://root:@localhost:3306/temam";

async function main() {
  console.log("Checking and adding 'rejectionReason' column to 'receipt_vouchers' table in MySQL...");
  const connection = await mysql.createConnection(DATABASE_URL);

  try {
    const [cols] = await connection.query("SHOW COLUMNS FROM receipt_vouchers LIKE 'rejectionReason'");
    if (Array.isArray(cols) && cols.length === 0) {
      await connection.query("ALTER TABLE receipt_vouchers ADD COLUMN rejectionReason TEXT");
      console.log("✅ Added column 'rejectionReason' to table 'receipt_vouchers'");
    } else {
      console.log("ℹ️ Column 'rejectionReason' already exists in 'receipt_vouchers'");
    }
  } catch (err) {
    console.error("Error altering table:", err);
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
