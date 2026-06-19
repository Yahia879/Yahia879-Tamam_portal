import mysql from "mysql2/promise";

async function main() {
  const connectionString = "mysql://root:@localhost:3306/test_temam";
  try {
    const connection = await mysql.createConnection(connectionString);
    console.log("Connected to test_temam database.");
    
    // 1. Update the order beneficiaryBank
    console.log("Updating bank name for DO-2026-0002...");
    await connection.execute(
      "UPDATE `disbursement_orders` SET `beneficiaryBank` = 'مصرف الراجحي' WHERE `orderNumber` = 'DO-2026-0002'"
    );
    console.log("✅ Order updated successfully.");
    
    // 2. Update the related disbursement request attachmentsJson
    console.log("Updating attachmentsJson for disbursement request #2...");
    const [rows]: any = await connection.execute(
      "SELECT `attachmentsJson` FROM `disbursement_requests` WHERE `id` = 2"
    );
    
    if (rows.length > 0 && rows[0].attachmentsJson) {
      try {
        const attachments = JSON.parse(rows[0].attachmentsJson);
        if (Array.isArray(attachments)) {
          const info = attachments.find((a: any) => a.name === "custom_supplier_info");
          if (info && info.url) {
            const supplierData = JSON.parse(info.url);
            supplierData.bank = "مصرف الراجحي";
            info.url = JSON.stringify(supplierData);
            
            const updatedJson = JSON.stringify(attachments);
            await connection.execute(
              "UPDATE `disbursement_requests` SET `attachmentsJson` = ? WHERE `id` = 2",
              [updatedJson]
            );
            console.log("✅ Disbursement request attachments updated successfully.");
          }
        }
      } catch (parseErr: any) {
        console.error("Error parsing attachments JSON:", parseErr.message);
      }
    }
    
    await connection.end();
  } catch (err: any) {
    console.error("Database update error:", err.message);
  }
}

main();
