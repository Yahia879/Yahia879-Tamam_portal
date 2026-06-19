import mysql from "mysql2/promise";

async function main() {
  const connectionString = "mysql://root:@localhost:3306/test_temam";
  try {
    const connection = await mysql.createConnection(connectionString);
    console.log("Connected to test_temam database.");
    
    const createTableQuery = `
      CREATE TABLE \`projects\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`projectNumber\` varchar(50) NOT NULL,
        \`requestId\` int NOT NULL,
        \`name\` varchar(255) NOT NULL,
        \`description\` text,
        \`managerId\` int,
        \`status\` enum('planning','in_progress','on_hold','completed','cancelled') DEFAULT 'planning',
        \`budget\` decimal(15,2),
        \`actualCost\` decimal(15,2),
        \`startDate\` datetime,
        \`expectedEndDate\` datetime,
        \`actualEndDate\` datetime,
        \`completionPercentage\` int DEFAULT 0,
        \`createdAt\` timestamp NOT NULL DEFAULT (now()),
        \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT \`projects_id\` PRIMARY KEY(\`id\`),
        CONSTRAINT \`projects_projectNumber_unique\` UNIQUE(\`projectNumber\`)
      );
    `;
    
    console.log("Creating 'projects' table...");
    await connection.execute(createTableQuery);
    console.log("🎉 'projects' table created successfully!");
    
    await connection.end();
  } catch (err: any) {
    console.error("Error creating projects table:", err.message);
  }
}

main();
