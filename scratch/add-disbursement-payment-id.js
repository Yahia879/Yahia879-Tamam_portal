import mysql from "mysql2/promise";

async function main() {
  const connection = await mysql.createConnection("mysql://root:@localhost:3306/temam");
  console.log("Connected to MySQL!");

  try {
    await connection.execute("ALTER TABLE disbursement_requests ADD COLUMN paymentId INT NULL REFERENCES payments(id) ON DELETE SET NULL;");
    console.log("Column paymentId added to disbursement_requests successfully!");
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log("paymentId column already exists.");
    } else {
      throw error;
    }
  }

  await connection.end();
}

main().catch(console.error);
