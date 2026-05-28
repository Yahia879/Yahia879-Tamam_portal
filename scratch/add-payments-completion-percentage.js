import mysql from "mysql2/promise";

async function main() {
  const connection = await mysql.createConnection("mysql://root:@localhost:3306/temam");
  console.log("Connected to MySQL!");

  try {
    await connection.execute("ALTER TABLE payments ADD COLUMN completionPercentage INT NULL;");
    console.log("Column completionPercentage added to payments successfully!");
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log("completionPercentage column already exists.");
    } else {
      throw error;
    }
  }

  await connection.end();
}

main().catch(console.error);
