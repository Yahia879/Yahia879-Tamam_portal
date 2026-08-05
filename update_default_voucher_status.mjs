import "dotenv/config";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL || "mysql://root:@localhost:3306/temam";

async function main() {
  console.log("Updating 'status' column default in 'receipt_vouchers' table to 'pending_approval'...");
  const connection = await mysql.createConnection(DATABASE_URL);

  try {
    await connection.query("ALTER TABLE receipt_vouchers MODIFY COLUMN status VARCHAR(50) DEFAULT 'pending_approval'");
    console.log("✅ Updated column default to 'pending_approval'");

    const [res] = await connection.query("UPDATE receipt_vouchers SET status = 'pending_approval' WHERE status IS NULL OR status = 'approved' OR status = ''");
    console.log("✅ Reset existing vouchers status to 'pending_approval':", res.affectedRows, "rows affected");
  } catch (err) {
    console.error("Error updating table:", err);
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
