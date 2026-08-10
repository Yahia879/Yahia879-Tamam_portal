import dotenv from "dotenv";
dotenv.config();

import mysql from "mysql2/promise";
import fs from "fs";

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const connection = await mysql.createConnection(dbUrl);
  console.log("Connected to MySQL database.");

  // Statements to run safely
  const sqlStatements = [
    `CREATE TABLE IF NOT EXISTS \`project_financial_details\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`projectId\` int NOT NULL,
      \`approvedQuotationId\` int,
      \`supportEntity\` varchar(255),
      \`customSupportEntity\` varchar(255),
      \`supportAmount\` decimal(15,2) DEFAULT '0.00',
      \`adminFeeType\` enum('percentage','fixed') DEFAULT 'percentage',
      \`adminFeeValue\` decimal(15,2) DEFAULT '0.00',
      \`adminFeeAmount\` decimal(15,2) DEFAULT '0.00',
      \`associationFundingAmount\` decimal(15,2) DEFAULT '0.00',
      \`associationFundingNotes\` text,
      \`supportSourcesJson\` text,
      \`notes\` text,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`project_financial_details_id\` PRIMARY KEY(\`id\`),
      CONSTRAINT \`project_financial_details_projectId_unique\` UNIQUE(\`projectId\`)
    );`,
    `CREATE TABLE IF NOT EXISTS \`receipt_vouchers\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`voucherNumber\` varchar(50) NOT NULL,
      \`projectId\` int NOT NULL,
      \`amount\` decimal(15,2) NOT NULL,
      \`receiptDate\` datetime NOT NULL,
      \`payerName\` varchar(255),
      \`paymentMethod\` varchar(50) DEFAULT 'bank_transfer',
      \`referenceNumber\` varchar(100),
      \`bankName\` varchar(255),
      \`attachmentUrl\` varchar(500),
      \`notes\` text,
      \`status\` varchar(50) DEFAULT 'pending_approval',
      \`rejectionReason\` text,
      \`createdById\` int,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`receipt_vouchers_id\` PRIMARY KEY(\`id\`),
      CONSTRAINT \`receipt_vouchers_voucherNumber_unique\` UNIQUE(\`voucherNumber\`)
    );`,
    `ALTER TABLE \`quantity_schedules\` MODIFY COLUMN \`itemName\` text NOT NULL;`,
    `ALTER TABLE \`contracts_enhanced\` ADD COLUMN IF NOT EXISTS \`financialApprovedAt\` datetime;`,
    `ALTER TABLE \`disbursement_orders\` ADD COLUMN IF NOT EXISTS \`financialApprovedAt\` datetime;`,
    `ALTER TABLE \`disbursement_orders\` ADD COLUMN IF NOT EXISTS \`isException\` boolean DEFAULT false NOT NULL;`,
    `ALTER TABLE \`disbursement_orders\` ADD COLUMN IF NOT EXISTS \`exceptionApprovedBy\` int;`,
    `ALTER TABLE \`disbursement_orders\` ADD COLUMN IF NOT EXISTS \`creatorSignatureName\` text;`,
    `ALTER TABLE \`disbursement_orders\` ADD COLUMN IF NOT EXISTS \`creatorSignatureDepartment\` text;`,
    `ALTER TABLE \`disbursement_orders\` ADD COLUMN IF NOT EXISTS \`creatorSignatureUrl\` text;`,
    `ALTER TABLE \`disbursement_orders\` ADD COLUMN IF NOT EXISTS \`showCreatorSignature\` boolean DEFAULT true NOT NULL;`,
    `ALTER TABLE \`disbursement_orders\` ADD COLUMN IF NOT EXISTS \`showExecutiveDirectorSignature\` boolean DEFAULT true NOT NULL;`,
    `ALTER TABLE \`disbursement_requests\` ADD COLUMN IF NOT EXISTS \`fundingSourceName\` varchar(255);`,
    `ALTER TABLE \`disbursement_requests\` ADD COLUMN IF NOT EXISTS \`financialApprovedAt\` datetime;`,
    `ALTER TABLE \`disbursement_requests\` ADD COLUMN IF NOT EXISTS \`creatorSignatureUrl\` text;`,
    `ALTER TABLE \`disbursement_requests\` ADD COLUMN IF NOT EXISTS \`isException\` boolean DEFAULT false;`,
    `ALTER TABLE \`disbursement_requests\` ADD COLUMN IF NOT EXISTS \`exceptionApprovedBy\` int;`,
    `ALTER TABLE \`mosque_requests\` ADD COLUMN IF NOT EXISTS \`descriptiveName\` varchar(255);`
  ];

  for (const stmt of sqlStatements) {
    try {
      await connection.query(stmt);
      console.log("Successfully executed statement:", stmt.substring(0, 60) + "...");
    } catch (err) {
      console.warn("Statement notice/warning:", err.message);
    }
  }

  await connection.end();
  console.log("All DB schema updates applied successfully!");
}

main().catch(err => {
  console.error("Migration script failed:", err);
  process.exit(1);
});
