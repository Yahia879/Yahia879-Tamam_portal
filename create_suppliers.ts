import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection({
    uri: 'mysql://root:@localhost:3306/temam',
  });
  try {
    const createTableSQL = `
CREATE TABLE \`suppliers\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`name\` varchar(255) NOT NULL,
  \`type\` enum('contractor','supplier','service_provider') DEFAULT 'supplier',
  \`entityType\` enum('establishment','company','individual','other') DEFAULT 'establishment',
  \`commercialRegister\` varchar(50) NOT NULL,
  \`commercialActivity\` varchar(500),
  \`yearsOfExperience\` int,
  \`workFields\` json,
  \`address\` text,
  \`city\` varchar(100),
  \`googleMapsUrl\` varchar(500),
  \`googleMapsLat\` decimal(10,7),
  \`googleMapsLng\` decimal(10,7),
  \`email\` varchar(320) NOT NULL,
  \`phone\` varchar(20) NOT NULL,
  \`phoneSecondary\` varchar(20),
  \`contactPerson\` varchar(255) NOT NULL,
  \`contactPersonTitle\` varchar(100),
  \`bankAccountName\` varchar(255),
  \`bankName\` varchar(255),
  \`iban\` varchar(50),
  \`taxNumber\` varchar(50),
  \`commercialRegisterDoc\` longtext,
  \`vatCertificateDoc\` longtext,
  \`nationalAddressDoc\` longtext,
  \`bankCertificateDoc\` longtext,
  \`otherAttachments\` json,
  \`approvalStatus\` enum('pending','approved','rejected') DEFAULT 'pending',
  \`approvedBy\` int,
  \`approvedAt\` datetime,
  \`rejectionReason\` text,
  \`status\` enum('active','inactive','blacklisted') DEFAULT 'active',
  \`rating\` int,
  \`notes\` text,
  \`createdBy\` int,
  \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT \`suppliers_id\` PRIMARY KEY(\`id\`)
);
    `;
    console.log('Creating suppliers table...');
    await connection.execute(createTableSQL);
    console.log('Successfully created suppliers table');
  } catch(e: any) {
    console.error(e.message);
  }
  await connection.end();
}

main();
