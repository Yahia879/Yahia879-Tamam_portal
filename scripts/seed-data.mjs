// Script لإضافة بيانات تجريبية للنظام
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

async function seed() {
  console.log("🌱 بدء إضافة البيانات التجريبية...");

  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection);

  try {
    // إضافة مساجد تجريبية
    console.log("📍 إضافة المساجد التجريبية...");
    const mosques = [
      {
        name: "جامع الملك فهد",
        status: "existing",
        ownership: "government",
        city: "أبها",
        district: "المنسك",
        latitude: 18.2164,
        longitude: 42.5053,
        capacity: 2000,
        imamName: "الشيخ عبدالله الأحمري",
        imamPhone: "0501234567",
        isApproved: true,
      },
      {
        name: "مسجد الرحمة",
        status: "existing",
        ownership: "waqf",
        city: "خميس مشيط",
        district: "الراقي",
        latitude: 18.3066,
        longitude: 42.7296,
        capacity: 800,
        imamName: "الشيخ محمد الشهري",
        imamPhone: "0502345678",
        isApproved: true,
      },
      {
        name: "مسجد التقوى",
        status: "under_construction",
        ownership: "private",
        city: "بيشة",
        district: "الخالدية",
        latitude: 20.0063,
        longitude: 42.6063,
        capacity: 500,
        imamName: "الشيخ سعيد القحطاني",
        imamPhone: "0503456789",
        isApproved: true,
      },
      {
        name: "جامع النور",
        status: "existing",
        ownership: "government",
        city: "النماص",
        district: "المركز",
        latitude: 19.1234,
        longitude: 42.1234,
        capacity: 1200,
        imamName: "الشيخ فهد الغامدي",
        imamPhone: "0504567890",
        isApproved: true,
      },
      {
        name: "مسجد الإيمان",
        status: "new",
        ownership: "waqf",
        city: "محايل عسير",
        district: "الصناعية",
        latitude: 18.5456,
        longitude: 42.0456,
        capacity: 600,
        imamName: "الشيخ أحمد العسيري",
        imamPhone: "0505678901",
        isApproved: false,
      },
      {
        name: "مسجد الهدى",
        status: "existing",
        ownership: "private",
        city: "ظهران الجنوب",
        district: "الشرقي",
        latitude: 17.4789,
        longitude: 43.4789,
        capacity: 400,
        imamName: "الشيخ خالد الدوسري",
        imamPhone: "0506789012",
        isApproved: true,
      },
      {
        name: "جامع السلام",
        status: "existing",
        ownership: "government",
        city: "تثليث",
        district: "الوسط",
        latitude: 19.4321,
        longitude: 43.4321,
        capacity: 1500,
        imamName: "الشيخ علي الزهراني",
        imamPhone: "0507890123",
        isApproved: true,
      },
      {
        name: "مسجد البركة",
        status: "under_construction",
        ownership: "waqf",
        city: "سراة عبيدة",
        district: "الجنوبي",
        latitude: 18.2345,
        longitude: 42.9345,
        capacity: 700,
        imamName: "الشيخ عمر الحربي",
        imamPhone: "0508901234",
        isApproved: true,
      },
      {
        name: "مسجد الفجر",
        status: "existing",
        ownership: "private",
        city: "رجال ألمع",
        district: "الشمالي",
        latitude: 18.2567,
        longitude: 42.2567,
        capacity: 350,
        imamName: "الشيخ ناصر المالكي",
        imamPhone: "0509012345",
        isApproved: true,
      },
      {
        name: "جامع الخير",
        status: "existing",
        ownership: "government",
        city: "أحد رفيدة",
        district: "المركز",
        latitude: 18.2089,
        longitude: 42.8089,
        capacity: 1000,
        imamName: "الشيخ سلمان الشمراني",
        imamPhone: "0500123456",
        isApproved: true,
      },
    ];

    for (const mosque of mosques) {
      await connection.execute(
        `INSERT INTO mosques (name, status, ownership, city, district, latitude, longitude, capacity, imamName, imamPhone, approvalStatus, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE name = name`,
        [
          mosque.name,
          mosque.status,
          mosque.ownership,
          mosque.city,
          mosque.district,
          mosque.latitude,
          mosque.longitude,
          mosque.capacity,
          mosque.imamName,
          mosque.imamPhone,
          mosque.isApproved ? "approved" : "pending",
        ]
      );
    }
    console.log(`✅ تم إضافة ${mosques.length} مسجد`);

    // إضافة شركاء تجريبيين
    console.log("🤝 إضافة الشركاء التجريبيين...");
    const partners = [
      {
        name: "شركة الراجحي للتنمية",
        type: "strategic",
        description: "شريك استراتيجي في دعم مشاريع بناء المساجد",
        website: "https://www.alrajhi.com",
        isActive: true,
      },
      {
        name: "مؤسسة الوقف الخيري",
        type: "sponsor",
        description: "داعم رئيسي لبرامج صيانة المساجد",
        website: "https://www.waqf.org.sa",
        isActive: true,
      },
      {
        name: "جمعية البر الخيرية",
        type: "supporter",
        description: "شريك في تنفيذ برامج سقيا الماء",
        website: "https://www.albirr.org.sa",
        isActive: true,
      },
      {
        name: "شركة المقاولات المتحدة",
        type: "supporter",
        description: "مقاول معتمد لمشاريع البناء والترميم",
        website: "https://www.ucc.com.sa",
        isActive: true,
      },
      {
        name: "مؤسسة التجهيزات الحديثة",
        type: "media",
        description: "مورد معتمد لتجهيزات المساجد",
        website: "https://www.modern-eq.com",
        isActive: true,
      },
    ];

    for (const partner of partners) {
      await connection.execute(
        `INSERT INTO partners (name, nameAr, description, descriptionAr, websiteUrl, partnerType, isActive, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE name = name`,
        [partner.name, partner.name, partner.description, partner.description, partner.website, partner.type, partner.isActive]
      );
    }
    console.log(`✅ تم إضافة ${partners.length} شريك`);

    // إضافة إعدادات الهوية البصرية
    console.log("🎨 إضافة إعدادات الهوية البصرية...");
    
    // إضافة إعدادات الهوية
    const brandSettings = [
      { key: "organizationName", value: "Tamam Portal", type: "text", desc: "اسم المنظمة بالإنجليزية" },
      { key: "organizationNameAr", value: "بوابة تمام للعناية بالمساجد", type: "text", desc: "اسم المنظمة بالعربية" },
      { key: "tagline", value: "Caring for Mosques", type: "text", desc: "الشعار بالإنجليزية" },
      { key: "taglineAr", value: "نعتني بمساجدكم", type: "text", desc: "الشعار بالعربية" },
    ];
    for (const setting of brandSettings) {
      await connection.execute(
        `INSERT INTO brand_settings (settingKey, settingValue, settingType, description, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE settingValue = ?`,
        [setting.key, setting.value, setting.type, setting.desc, setting.value]
      );
    }
    
    // إضافة الألوان
    const colors = [
      { name: "اللون الرئيسي", value: "#0d9488", type: "primary" },
      { name: "اللون الثانوي", value: "#14b8a6", type: "secondary" },
      { name: "لون التمييز", value: "#f59e0b", type: "accent" },
    ];
    for (const color of colors) {
      await connection.execute(
        `INSERT INTO brand_colors (name, hexValue, colorType, isActive, createdAt, updatedAt)
         VALUES (?, ?, ?, true, NOW(), NOW())
         ON DUPLICATE KEY UPDATE hexValue = ?`,
        [color.name, color.value, color.type, color.value]
      );
    }
    console.log("✅ تم إضافة إعدادات الهوية البصرية");

    // إضافة تصنيفات المدن
    console.log("🏙️ إضافة تصنيفات المدن...");
    const cities = [
      "أبها",
      "خميس مشيط",
      "بيشة",
      "النماص",
      "محايل عسير",
      "ظهران الجنوب",
      "تثليث",
      "سراة عبيدة",
      "رجال ألمع",
      "أحد رفيدة",
      "بلقرن",
      "المجاردة",
      "البرك",
      "بارق",
      "تنومة",
      "طريب",
      "الحرجة",
      "الأمواه",
    ];

    for (const city of cities) {
      await connection.execute(
        `INSERT INTO categories (name, nameAr, type, isActive, createdAt)
         VALUES (?, ?, 'city', true, NOW())
         ON DUPLICATE KEY UPDATE name = name`,
        [city, city]
      );
    }
    console.log(`✅ تم إضافة ${cities.length} مدينة`);

    console.log("\n🎉 تم إضافة جميع البيانات التجريبية بنجاح!");
  } catch (error) {
    console.error("❌ خطأ في إضافة البيانات:", error);
  } finally {
    await connection.end();
  }
}

seed();
