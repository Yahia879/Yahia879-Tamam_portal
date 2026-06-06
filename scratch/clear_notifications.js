import mysql from "mysql2/promise";

async function main() {
  const connection = await mysql.createConnection("mysql://root:@localhost:3306/temam");
  console.log("Connected to MySQL!");

  try {
    const [result] = await connection.execute("DELETE FROM notifications;");
    console.log("Deleted notifications successfully! Affected rows:", result.affectedRows);
  } catch (error) {
    console.error("Error deleting notifications:", error);
  }

  await connection.end();
}

main().catch(console.error);
