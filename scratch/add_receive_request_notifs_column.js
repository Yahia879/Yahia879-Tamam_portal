import mysql from "mysql2/promise";

async function main() {
  const connection = await mysql.createConnection("mysql://root:@localhost:3306/temam");
  console.log("Connected to MySQL!");

  try {
    await connection.execute("ALTER TABLE users ADD COLUMN receiveRequestNotifications TINYINT(1) DEFAULT 0;");
    console.log("Column receiveRequestNotifications added to users successfully!");
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log("receiveRequestNotifications column already exists in users.");
    } else {
      throw error;
    }
  }

  try {
    await connection.execute("ALTER TABLE roles ADD COLUMN receiveRequestNotifications TINYINT(1) DEFAULT 0;");
    console.log("Column receiveRequestNotifications added to roles successfully!");
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log("receiveRequestNotifications column already exists in roles.");
    } else {
      throw error;
    }
  }

  await connection.end();
}

main().catch(console.error);
