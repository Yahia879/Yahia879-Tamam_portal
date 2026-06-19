import mysql from "mysql2/promise";

async function main() {
  const connectionString = "mysql://root:@localhost:3306/temam";
  try {
    const connection = await mysql.createConnection(connectionString);
    console.log("Recreating brand_settings table safely...");

    // 1. Create table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS \`brand_settings\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`settingKey\` varchar(100) NOT NULL,
        \`settingValue\` text,
        \`settingType\` varchar(50),
        \`description\` varchar(255),
        \`updatedBy\` int,
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT \`brand_settings_id\` PRIMARY KEY(\`id\`),
        CONSTRAINT \`brand_settings_settingKey_unique\` UNIQUE(\`settingKey\`)
      )
    `);
    console.log("[✓] Table 'brand_settings' created.");

    // 2. Add foreign key
    try {
      await connection.execute(`
        ALTER TABLE \`brand_settings\` 
        ADD CONSTRAINT \`brand_settings_updatedBy_users_id_fk\` 
        FOREIGN KEY (\`updatedBy\`) REFERENCES \`users\`(\`id\`) 
        ON DELETE SET NULL ON UPDATE NO ACTION
      `);
      console.log("[✓] Foreign key constraint 'brand_settings_updatedBy_users_id_fk' added.");
    } catch (fkErr: any) {
      if (fkErr.message.includes("Duplicate key name") || fkErr.message.includes("already exists")) {
        console.log("[!] Foreign key constraint already exists.");
      } else {
        throw fkErr;
      }
    }

    console.log("[Success] brand_settings table has been fully and safely restored!");
    await connection.end();
  } catch (err: any) {
    console.error("[Error] Failed to restore table:", err.message);
  }
}

main();
