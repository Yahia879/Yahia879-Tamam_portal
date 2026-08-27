import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

async function run() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  const createTableSql = `
    CREATE TABLE IF NOT EXISTS public_submissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      submissionType VARCHAR(50) NOT NULL,
      category VARCHAR(50) NOT NULL,
      name TEXT NOT NULL,
      phone VARCHAR(20) NOT NULL,
      email VARCHAR(320) NULL,
      city VARCHAR(100) NULL,
      customRoleTitle VARCHAR(255) NULL,
      details TEXT NULL,
      landArea VARCHAR(100) NULL,
      landDimensions VARCHAR(100) NULL,
      landLocation VARCHAR(255) NULL,
      landOwner VARCHAR(255) NULL,
      inKindType VARCHAR(255) NULL,
      inKindQuantity VARCHAR(100) NULL,
      inKindCondition VARCHAR(100) NULL,
      inKindDeliveryAvailable BOOLEAN DEFAULT FALSE,
      financialAmount DECIMAL(15, 2) NULL,
      financialBankName VARCHAR(100) NULL,
      attachmentUrl VARCHAR(500) NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'new',
      adminNotes TEXT NULL,
      assignedTo INT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (assignedTo) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  await connection.query(createTableSql);
  console.log("✅ public_submissions table created/verified successfully.");

  await connection.end();
}

run().catch((err) => {
  console.error("❌ Error creating table:", err);
  process.exit(1);
});
