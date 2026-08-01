import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const dbUrl = process.env.DATABASE_URL || "mysql://root:@localhost:3306/temam";
  console.log("Connecting to database...", dbUrl);
  const connection = await mysql.createConnection(dbUrl);
  console.log("Connected to MySQL successfully!");

  try {
    // 1. Create project_financial_details table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS project_financial_details (
        id INT AUTO_INCREMENT PRIMARY KEY,
        projectId INT NOT NULL UNIQUE,
        approvedQuotationId INT NULL,
        supportEntity VARCHAR(255) NULL,
        customSupportEntity VARCHAR(255) NULL,
        supportAmount DECIMAL(15, 2) DEFAULT 0.00,
        adminFeeType ENUM('percentage', 'fixed') DEFAULT 'percentage',
        adminFeeValue DECIMAL(15, 2) DEFAULT 0.00,
        adminFeeAmount DECIMAL(15, 2) DEFAULT 0.00,
        notes TEXT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
        CONSTRAINT fk_pfd_project FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
        CONSTRAINT fk_pfd_quotation FOREIGN KEY (approvedQuotationId) REFERENCES quotations(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("Table project_financial_details created or verified.");

    // 2. Create receipt_vouchers table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS receipt_vouchers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        voucherNumber VARCHAR(50) NOT NULL UNIQUE,
        projectId INT NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        receiptDate DATETIME NOT NULL,
        payerName VARCHAR(255) NULL,
        paymentMethod VARCHAR(50) DEFAULT 'bank_transfer',
        referenceNumber VARCHAR(100) NULL,
        bankName VARCHAR(255) NULL,
        attachmentUrl VARCHAR(500) NULL,
        notes TEXT NULL,
        createdById INT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
        CONSTRAINT fk_rv_project FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
        CONSTRAINT fk_rv_user FOREIGN KEY (createdById) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("Table receipt_vouchers created or verified.");

  } catch (error) {
    console.error("Migration error:", error);
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
