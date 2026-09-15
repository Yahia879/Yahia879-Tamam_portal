import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const items = [
  {
    nameAr: "عامل نظافة متفرغ للمسجد",
    category: "العمالة",
    unit: "شهر",
    description: "عامل نظافة مخصص للمسجد متفرغ لمتابعة النظافة اليومية",
    frequency: "شهري",
    monthlyLimit: 1,
    quarterlyLimit: 3,
    semiAnnualLimit: 6,
  },

  {
    nameAr: "صابون سائل للأيدي",
    category: "مواد النظافة",
    unit: "جالون",
    description: "جالونات صابون سائل عالي الجودة لمغاسل الوضوء",
    frequency: "شهري",
    monthlyLimit: 4,
    quarterlyLimit: 12,
    semiAnnualLimit: 24,
  },
  {
    nameAr: "صابون رغوة للمغاسل",
    category: "مواد النظافة",
    unit: "عبوة",
    description: "عبوات صابون رغوة للموزعات الأوتوماتيكية واليدوية",
    frequency: "شهري",
    monthlyLimit: 6,
    quarterlyLimit: 18,
    semiAnnualLimit: 36,
  },
  {
    nameAr: "مطهر ومعقم أرضيات",
    category: "مواد النظافة",
    unit: "جالون",
    description: "معقم ومطهر مركز برائحة زكية لأرضيات ودورات المياه",
    frequency: "شهري",
    monthlyLimit: 5,
    quarterlyLimit: 15,
    semiAnnualLimit: 30,
  },
  {
    nameAr: "أجهزة تعطير ذكية",
    category: "المعطرات",
    unit: "جهاز",
    description: "أجهزة تعطير ذكية بتقنية النانو لمصليات الرجال والنساء",
    frequency: "شهري",
    monthlyLimit: 2,
    quarterlyLimit: 4,
    semiAnnualLimit: 6,
  },
  {
    nameAr: "عبوات زيت عطري فاخر",
    category: "المعطرات",
    unit: "عبوة",
    description: "زيوت عطرية مخصصة لأجهزة التعطير تدوم طويلاً",
    frequency: "شهري",
    monthlyLimit: 4,
    quarterlyLimit: 12,
    semiAnnualLimit: 24,
  },
  {
    nameAr: "كراتين مياه شرب (330 مل)",
    category: "سقيا الماء",
    unit: "كرتون",
    description: "كراتين مياه شرب معبأة لسقيا المصلين وضيوف المسجد",
    frequency: "شهري",
    monthlyLimit: 20,
    quarterlyLimit: 60,
    semiAnnualLimit: 120,
  },
  {
    nameAr: "أكياس نفايات كبيرة (50 جالون)",
    category: "البلاستيكيات",
    unit: "كرتون",
    description: "أكياس نفايات متينة وعالية التحمل للحاويات الكبيرة",
    frequency: "شهري",
    monthlyLimit: 3,
    quarterlyLimit: 9,
    semiAnnualLimit: 18,
  },
  {
    nameAr: "طقم مكانس ومساحات أرضية",
    category: "أدوات المسجد العامة",
    unit: "طقم",
    description: "أطقم مكانس ومساحات مياه مع مقابض ألومنيوم للمصلى والمرافق",
    frequency: "شهري",
    monthlyLimit: 2,
    quarterlyLimit: 6,
    semiAnnualLimit: 10,
  },
];

async function seed() {
  const databaseUrl = process.env.DATABASE_URL || "mysql://root:@localhost:3306/test_temam";
  console.log("Connecting to database...");
  const conn = await mysql.createConnection(databaseUrl);
  console.log("Connected to MySQL!");

  // Clean up any test records like 'تتتتتت' or unwanted items
  await conn.execute("DELETE FROM categories WHERE type = 'sedana_items' AND (nameAr = 'تتتتتت' OR nameAr LIKE '%صيانة دورية%')");

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const [existing] = await conn.execute(
      "SELECT id FROM categories WHERE type = 'sedana_items' AND nameAr = ?",
      [item.nameAr]
    );

    const metadata = JSON.stringify({
      category: item.category,
      description: item.description,
      monthlyLimit: item.monthlyLimit,
      quarterlyLimit: item.quarterlyLimit,
      semiAnnualLimit: item.semiAnnualLimit,
      limits: {
        "شهري": item.monthlyLimit,
        "ربع سنوي": item.quarterlyLimit,
        "نصف سنوي": item.semiAnnualLimit,
      },
      unit: item.unit,
      frequency: item.frequency,
      defaultQuantity: 0,
    });

    const uniqueName = `sedana_${Date.now()}_${i}`;

    if (existing.length === 0) {
      await conn.execute(
        "INSERT INTO categories (name, nameAr, type, sortOrder, isActive, metadata, createdAt) VALUES (?, ?, 'sedana_items', ?, true, ?, NOW())",
        [uniqueName, item.nameAr, i + 1, metadata]
      );
      console.log(`✅ تم إضافة صنف: [${item.category}] ${item.nameAr}`);
    } else {
      await conn.execute(
        "UPDATE categories SET metadata = ?, sortOrder = ?, isActive = true WHERE id = ?",
        [metadata, i + 1, existing[0].id]
      );
      console.log(`ℹ️ تم تحديث صنف موجود: [${item.category}] ${item.nameAr}`);
    }
  }

  const [countRows] = await conn.execute(
    "SELECT COUNT(*) as cnt FROM categories WHERE type = 'sedana_items' AND isActive = true"
  );
  console.log(`\n🎉 إجمالي أصناف خدمات سدانة النشطة في قاعدة البيانات الآن: ${countRows[0].cnt}`);

  await conn.end();
}

seed().catch((err) => {
  console.error("Error seeding sedana items:", err);
  process.exit(1);
});
