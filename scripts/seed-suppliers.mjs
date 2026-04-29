import mysql from "mysql2/promise";

const connection = await mysql.createConnection(process.env.DATABASE_URL);

console.log("🏢 إنشاء الموردين...");

const suppliers = [
  {
    name: "شركة البناء المتقدم",
    entityType: "company",
    commercialRegister: "1234567890",
    commercialActivity: "مقاولات عامة",
    yearsOfExperience: 15,
    contactPerson: "محمد أحمد العمري",
    contactPersonTitle: "مدير المشاريع",
    phone: "0501234567",
    email: "info@advanced-build.sa",
    city: "أبها",
    address: "حي الورود، شارع الملك فهد",
    bankName: "البنك الأهلي",
    bankAccountName: "شركة البناء المتقدم",
    iban: "SA1234567890123456789012",
    taxNumber: "300123456789012",
    approvalStatus: "approved",
  },
  {
    name: "مؤسسة الإتقان للصيانة",
    entityType: "establishment",
    commercialRegister: "0987654321",
    commercialActivity: "صيانة وترميم",
    yearsOfExperience: 10,
    contactPerson: "عبدالله سعيد القحطاني",
    contactPersonTitle: "المدير التنفيذي",
    phone: "0559876543",
    email: "contact@itqan-maintenance.sa",
    city: "خميس مشيط",
    address: "حي الراقي، شارع الأمير سلطان",
    bankName: "بنك الراجحي",
    bankAccountName: "مؤسسة الإتقان للصيانة",
    iban: "SA9876543210987654321098",
    taxNumber: "300987654321098",
    approvalStatus: "approved",
  },
  {
    name: "شركة التجهيزات الحديثة",
    entityType: "company",
    commercialRegister: "5678901234",
    commercialActivity: "توريد وتركيب",
    yearsOfExperience: 8,
    contactPerson: "فهد خالد الشهري",
    contactPersonTitle: "مدير المبيعات",
    phone: "0545678901",
    email: "sales@modern-supplies.sa",
    city: "أبها",
    address: "حي النزهة، شارع الملك خالد",
    bankName: "بنك الرياض",
    bankAccountName: "شركة التجهيزات الحديثة",
    iban: "SA5678901234567890123456",
    taxNumber: "300567890123456",
    approvalStatus: "approved",
  },
];

const supplierIds = [];
for (const supplier of suppliers) {
  const [result] = await connection.execute(
    `INSERT INTO suppliers (name, entityType, commercialRegister, commercialActivity, yearsOfExperience, contactPerson, contactPersonTitle, phone, email, city, address, bankName, bankAccountName, iban, taxNumber, approvalStatus, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [supplier.name, supplier.entityType, supplier.commercialRegister, supplier.commercialActivity, supplier.yearsOfExperience, supplier.contactPerson, supplier.contactPersonTitle, supplier.phone, supplier.email, supplier.city, supplier.address, supplier.bankName, supplier.bankAccountName, supplier.iban, supplier.taxNumber, supplier.approvalStatus]
  );
  supplierIds.push(result.insertId);
  console.log(`  ✅ ${supplier.name} (ID: ${result.insertId})`);
}

console.log(`\n📝 supplierIds: [${supplierIds.join(", ")}]`);

await connection.end();
console.log("\n✅ تم إنشاء الموردين بنجاح!");
