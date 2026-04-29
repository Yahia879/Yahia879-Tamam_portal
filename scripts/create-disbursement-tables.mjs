import mysql from "mysql2/promise";
const connection = await mysql.createConnection(process.env.DATABASE_URL);

console.log("إنشاء جداول الصرف...");

// جدول طلبات الصرف
await connection.execute(`
  CREATE TABLE IF NOT EXISTS disbursement_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    requestNumber VARCHAR(50) NOT NULL UNIQUE,
    contractId INT NOT NULL,
    projectId INT,
    paymentId INT,
    amount DECIMAL(15,2) NOT NULL,
    description TEXT,
    justification TEXT,
    beneficiaryName VARCHAR(255) NOT NULL,
    beneficiaryBank VARCHAR(255),
    beneficiaryIban VARCHAR(50),
    status ENUM('draft','pending','under_review','approved','rejected','processed') DEFAULT 'draft',
    attachments TEXT,
    requestedBy INT NOT NULL,
    requestedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewedBy INT,
    reviewedAt TIMESTAMP NULL,
    reviewNotes TEXT,
    approvedBy INT,
    approvedAt TIMESTAMP NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )
`);
console.log("  ✅ جدول disbursement_requests");

// جدول أوامر الصرف
await connection.execute(`
  CREATE TABLE IF NOT EXISTS disbursement_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    orderNumber VARCHAR(50) NOT NULL UNIQUE,
    disbursementRequestId INT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    paymentMethod VARCHAR(50),
    beneficiaryName VARCHAR(255) NOT NULL,
    beneficiaryBank VARCHAR(255),
    beneficiaryIban VARCHAR(50),
    status ENUM('draft','pending','approved','paid','cancelled') DEFAULT 'draft',
    transactionReference VARCHAR(100),
    createdBy INT NOT NULL,
    approvedBy INT,
    approvedAt TIMESTAMP NULL,
    paidAt TIMESTAMP NULL,
    paidBy INT,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )
`);
console.log("  ✅ جدول disbursement_orders");

await connection.end();
console.log("\n✅ تم إنشاء جداول الصرف بنجاح!");
