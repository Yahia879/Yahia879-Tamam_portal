import 'dotenv/config';
import mysql from 'mysql2/promise';

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL is not set");
    return;
  }
  const connection = await mysql.createConnection(dbUrl);
  try {
    console.log("Fetching disbursement orders with potentially missing info...");
    const [orders] = await connection.query(
      `SELECT o.id, o.orderNumber, o.beneficiaryName, o.beneficiaryBank, o.beneficiaryIban, 
              r.id as requestId, r.projectId, r.contractId, p.name as projectName, r.attachmentsJson
       FROM disbursement_orders o
       JOIN disbursement_requests r ON o.disbursementRequestId = r.id
       LEFT JOIN projects p ON r.projectId = p.id`
    ) as any[];

    console.log(`Found ${orders.length} orders total.`);

    for (const order of orders) {
      console.log(`\nOrder: ${order.orderNumber}`);
      console.log(`  Current Beneficiary: ${order.beneficiaryName}`);
      console.log(`  Current Bank: ${order.beneficiaryBank || 'NULL'}`);
      console.log(`  Current IBAN: ${order.beneficiaryIban || 'NULL'}`);

      let correctName = "";
      let correctBank = "";
      let correctIban = "";
      let correctAccountName = "";

      // 1. Try to check if it's a custom request (attachmentsJson contains custom_supplier_info)
      let customSupplier: any = null;
      if (order.attachmentsJson) {
        try {
          const attachments = JSON.parse(order.attachmentsJson);
          if (Array.isArray(attachments)) {
            const infoAttachment = attachments.find((a: any) => a.name === "custom_supplier_info");
            if (infoAttachment && infoAttachment.url) {
              customSupplier = JSON.parse(infoAttachment.url);
            }
          }
        } catch (e) {
          // ignore
        }
      }

      if (customSupplier) {
        correctName = customSupplier.name || "";
        correctBank = customSupplier.bank || "";
        correctIban = customSupplier.iban || "";
        correctAccountName = customSupplier.bankAccountName || customSupplier.name || "";
        console.log(`  Identified as custom request. Supplier info: Name=${correctName}, Bank=${correctBank}`);
      } else if (order.contractId) {
        // 2. Try to fetch contract supplier details
        const [contracts] = await connection.query(
          `SELECT secondPartyName, secondPartyBankName, secondPartyIban, secondPartyAccountName 
           FROM contracts_enhanced WHERE id = ?`,
          [order.contractId]
        ) as any[];

        if (contracts && contracts.length > 0) {
          const c = contracts[0];
          correctName = c.secondPartyName || "";
          correctBank = c.secondPartyBankName || "";
          correctIban = c.secondPartyIban || "";
          correctAccountName = c.secondPartyAccountName || c.secondPartyName || "";
          console.log(`  Identified as contract-linked request (Contract ID: ${order.contractId}). Supplier info: Name=${correctName}, Bank=${correctBank}`);
        }
      } else if (order.projectId) {
        // 3. Try to fetch active contract supplier details for project
        const [contracts] = await connection.query(
          `SELECT secondPartyName, secondPartyBankName, secondPartyIban, secondPartyAccountName 
           FROM contracts_enhanced WHERE projectId = ? AND status IN ('approved', 'active') LIMIT 1`,
          [order.projectId]
        ) as any[];

        if (contracts && contracts.length > 0) {
          const c = contracts[0];
          correctName = c.secondPartyName || "";
          correctBank = c.secondPartyBankName || "";
          correctIban = c.secondPartyIban || "";
          correctAccountName = c.secondPartyAccountName || c.secondPartyName || "";
          console.log(`  Identified as project-linked request (Project ID: ${order.projectId}). Supplier info: Name=${correctName}, Bank=${correctBank}`);
        }
      }

      // Check if we need to update
      const nameIsProjectName = order.beneficiaryName === order.projectName;
      const isMissingBankInfo = !order.beneficiaryBank || order.beneficiaryBank === "" || !order.beneficiaryIban || order.beneficiaryIban === "";
      
      if (correctName && (nameIsProjectName || isMissingBankInfo)) {
        console.log(`  -> UPDATING order ${order.orderNumber}...`);
        await connection.query(
          `UPDATE disbursement_orders 
           SET beneficiaryName = ?, beneficiaryBank = ?, beneficiaryIban = ?, beneficiaryAccountName = ? 
           WHERE id = ?`,
          [correctName, correctBank, correctIban, correctAccountName, order.id]
        );
        console.log(`  -> Updated successfully!`);
      } else {
        console.log(`  No update needed or supplier info not found.`);
      }
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await connection.end();
  }
}

main();
