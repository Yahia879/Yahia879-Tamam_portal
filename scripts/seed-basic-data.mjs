import mysql from "mysql2/promise";

const connection = await mysql.createConnection(process.env.DATABASE_URL);

console.log("🌱 بدء إنشاء البيانات التجريبية الأساسية...\n");

// 1. إنشاء المساجد
console.log("📍 إنشاء المساجد...");
const mosques = [
  {
    name: "مسجد الرحمة",
    city: "أبها",
    district: "حي الورود",
    address: "شارع الملك فهد، حي الورود",
    latitude: 18.2164,
    longitude: 42.5053,
    approvalStatus: "approved",
    status: "existing",
    ownership: "waqf",
    capacity: 500,
    area: 800,
    imamName: "الشيخ عبدالرحمن المالكي",
    imamPhone: "0501111111",
  },
  {
    name: "مسجد النور",
    city: "خميس مشيط",
    district: "حي الراقي",
    address: "شارع الأمير سلطان، حي الراقي",
    latitude: 18.3006,
    longitude: 42.7294,
    approvalStatus: "approved",
    status: "existing",
    ownership: "government",
    capacity: 800,
    area: 1200,
    imamName: "الشيخ محمد القحطاني",
    imamPhone: "0502222222",
  },
  {
    name: "مسجد الفجر",
    city: "رجال ألمع",
    district: "حي المركز",
    address: "الشارع العام، حي المركز",
    latitude: 18.2333,
    longitude: 42.2833,
    approvalStatus: "approved",
    status: "existing",
    ownership: "waqf",
    capacity: 200,
    area: 350,
    imamName: "الشيخ أحمد الألمعي",
    imamPhone: "0503333333",
  },
  {
    name: "مسجد التقوى",
    city: "بيشة",
    district: "حي النخيل",
    address: "شارع الملك عبدالعزيز، حي النخيل",
    latitude: 19.9833,
    longitude: 42.6000,
    approvalStatus: "approved",
    status: "existing",
    ownership: "government",
    capacity: 600,
    area: 900,
    imamName: "الشيخ سعيد البيشي",
    imamPhone: "0504444444",
  },
  {
    name: "مسجد الهداية",
    city: "النماص",
    district: "حي السوق",
    address: "الشارع الرئيسي، حي السوق",
    latitude: 19.1167,
    longitude: 42.1333,
    approvalStatus: "approved",
    status: "existing",
    ownership: "private",
    capacity: 150,
    area: 250,
    imamName: "الشيخ خالد النماصي",
    imamPhone: "0505555555",
  },
];

const mosqueIds = [];
for (const mosque of mosques) {
  const [result] = await connection.execute(
    `INSERT INTO mosques (name, city, district, address, latitude, longitude, approvalStatus, status, ownership, capacity, area, imamName, imamPhone, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [mosque.name, mosque.city, mosque.district, mosque.address, mosque.latitude, mosque.longitude, mosque.approvalStatus, mosque.status, mosque.ownership, mosque.capacity, mosque.area, mosque.imamName, mosque.imamPhone]
  );
  mosqueIds.push(result.insertId);
  console.log(`  ✅ ${mosque.name} (ID: ${result.insertId})`);
}

// 2. إنشاء الموردين
console.log("\n🏢 إنشاء الموردين...");

// فحص أعمدة جدول الموردين أولاً
const [supplierColumns] = await connection.execute("DESCRIBE suppliers");
console.log("  أعمدة جدول الموردين:", supplierColumns.map(c => c.Field).join(", "));

const suppliers = [
  {
    name: "شركة البناء المتقدم",
    type: "company",
    registrationNumber: "1234567890",
    specialization: "مقاولات عامة",
    contactPerson: "محمد أحمد العمري",
    phone: "0501234567",
    email: "info@advanced-build.sa",
    address: "أبها، حي الورود، شارع الملك فهد",
    bankName: "البنك الأهلي",
    accountNumber: "SA1234567890123456789012",
    status: "approved",
  },
  {
    name: "مؤسسة الإتقان للصيانة",
    type: "establishment",
    registrationNumber: "0987654321",
    specialization: "صيانة وترميم",
    contactPerson: "عبدالله سعيد القحطاني",
    phone: "0559876543",
    email: "contact@itqan-maintenance.sa",
    address: "خميس مشيط، حي الراقي، شارع الأمير سلطان",
    bankName: "بنك الراجحي",
    accountNumber: "SA9876543210987654321098",
    status: "approved",
  },
  {
    name: "شركة التجهيزات الحديثة",
    type: "company",
    registrationNumber: "5678901234",
    specialization: "توريد وتركيب",
    contactPerson: "فهد خالد الشهري",
    phone: "0545678901",
    email: "sales@modern-supplies.sa",
    address: "أبها، حي النزهة، شارع الملك خالد",
    bankName: "بنك الرياض",
    accountNumber: "SA5678901234567890123456",
    status: "approved",
  },
];

const supplierIds = [];
for (const supplier of suppliers) {
  const [result] = await connection.execute(
    `INSERT INTO suppliers (name, type, registrationNumber, specialization, contactPerson, phone, email, address, bankName, accountNumber, status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [supplier.name, supplier.type, supplier.registrationNumber, supplier.specialization, supplier.contactPerson, supplier.phone, supplier.email, supplier.address, supplier.bankName, supplier.accountNumber, supplier.status]
  );
  supplierIds.push(result.insertId);
  console.log(`  ✅ ${supplier.name} (ID: ${result.insertId})`);
}

console.log("\n📊 ملخص البيانات الأساسية:");
console.log(`  - المساجد: ${mosqueIds.length}`);
console.log(`  - الموردين: ${supplierIds.length}`);

// حفظ IDs للاستخدام في السكربت التالي
console.log("\n📝 IDs للاستخدام:");
console.log(`  mosqueIds: [${mosqueIds.join(", ")}]`);
console.log(`  supplierIds: [${supplierIds.join(", ")}]`);

await connection.end();
console.log("\n✅ تم إنشاء البيانات الأساسية بنجاح!");
