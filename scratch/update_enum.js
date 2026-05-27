import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const dbUrl = process.env.DATABASE_URL || "mysql://root:@localhost:3306/temam";
  console.log("Connecting to:", dbUrl);
  const connection = await mysql.createConnection(dbUrl);
  console.log("Connected to MySQL!");

  try {
    console.log("Modifying ENUM column...");
    await connection.execute("ALTER TABLE disbursement_orders MODIFY COLUMN status ENUM('draft', 'pending', 'approved', 'rejected', 'executed', 'edited') DEFAULT 'draft';");
    console.log("ENUM column status updated successfully!");
  } catch (error) {
    console.error("Error modifying column:", error);
  }

  await connection.end();
}

main().catch(console.error);
