import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const dbUrl = process.env.DATABASE_URL || "mysql://root:@localhost:3306/test_temam";
  const connection = await mysql.createConnection(dbUrl);
  console.log("Connected to MySQL at", dbUrl);

  const query = `
    CREATE TABLE IF NOT EXISTS \`notification_trigger_settings\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`triggerId\` VARCHAR(100) NOT NULL,
      \`roleId\` VARCHAR(50) NOT NULL,
      \`channel\` VARCHAR(50) NOT NULL,
      \`enabled\` BOOLEAN NOT NULL DEFAULT FALSE,
      UNIQUE KEY \`unique_trigger_role_channel\` (\`triggerId\`, \`roleId\`, \`channel\`)
    );
  `;

  try {
    await connection.execute(query);
    console.log("notification_trigger_settings table created successfully!");
  } catch (error) {
    console.error("Error creating table:", error);
  }

  await connection.end();
}

main().catch(console.error);
