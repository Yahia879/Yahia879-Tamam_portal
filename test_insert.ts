import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection({
    uri: 'mysql://root:@localhost:3306/temam',
  });
  try {
    const query = `insert into \`contracts_enhanced\` (\`contractNumber\`, \`contractYear\`, \`contractSequence\`, \`templateId\`, \`contractType\`, \`contractTitle\`, \`projectId\`, \`requestId\`, \`signatoryId\`, \`supplierId\`, \`secondPartyName\`, \`secondPartyCommercialRegister\`, \`secondPartyRepresentative\`, \`secondPartyTitle\`, \`secondPartyAddress\`, \`secondPartyPhone\`, \`secondPartyEmail\`, \`secondPartyBankName\`, \`secondPartyIban\`, \`secondPartyAccountName\`, \`mosqueName\`, \`mosqueNeighborhood\`, \`mosqueCity\`, \`contractAmount\`, \`contractAmountText\`, \`duration\`, \`durationUnit\`, \`contractDate\`, \`contractDateHijri\`, \`startDate\`, \`endDate\`, \`status\`, \`customTerms\`, \`customNotifications\`, \`customGeneralTerms\`, \`paymentScheduleJson\`, \`clauseValuesJson\`, \`customClausesJson\`, \`documentUrl\`, \`signedDocumentUrl\`, \`approvedBy\`, \`approvedAt\`, \`createdBy\`) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    // I will pass mock values matching the user's attempt as close as possible
    const params = [
      'CNT-2026-0057', 2026, 57, 4, 'supply', 'yfsksdjf@gmail.com', 77, 130, 1, 1,
      'http://localhost:3000/suppliers', // secondPartyName
      'http://localhost:3000/suppliers', // secondPartyCommercialRegister
      'http://localhost:3000/suppliers', // secondPartyRepresentative
      'http://localhost:3000/suppliers', // secondPartyTitle
      'http://localhost:3000/suppliers', // secondPartyAddress
      'http://localhost:3000/suppliers', // secondPartyPhone -> THIS IS THE LIKELY CULPRIT IF IT WAS A URL
      'admin@tamam.org', // secondPartyEmail
      'بنك الرياض', // secondPartyBankName
      'SA0000000000000000000000', // secondPartyIban
      'http://localhost:3000/suppliers', // secondPartyAccountName
      null, null, null, // mosque info
      1000, null, // contractAmount, contractAmountText
      12, 'months', // duration, durationUnit
      new Date(), null, new Date(), new Date(), // dates
      'draft', // status
      null, null, null, // custom terms
      null, null, null, // json fields
      null, null, // urls
      null, null, null // audit
    ];

    await connection.execute(query, params);
    console.log("Insert succeeded!");
  } catch(e: any) {
    console.error("Error:", e.message);
  }
  await connection.end();
}

main();
