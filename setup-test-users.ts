import { getDb } from "./server/db";
import { users, userRoleAssignments } from "./drizzle/schema";
import { eq, and, not, inArray } from "drizzle-orm";

async function setupTestUsers() {
  const db = await getDb();
  
  console.log("🔍 جاري البحث عن المستخدمين الحاليين...");
  
  // جلب جميع المستخدمين
  const allUsers = await db.select().from(users);
  console.log(`📊 عدد المستخدمين الحاليين: ${allUsers.length}`);
  
  // تحديد المستخدمين المحميين (المدير وعبدالإله المرزوقي)
  const protectedUsers = allUsers.filter(u => 
    u.role === 'super_admin' || 
    u.name?.includes('عبدالإله') || 
    u.name?.includes('المرزوقي')
  );
  
  console.log(`🔒 المستخدمون المحميون (${protectedUsers.length}):`);
  protectedUsers.forEach(u => console.log(`  - ${u.name} (${u.email}) - ${u.role}`));
  
  const protectedIds = protectedUsers.map(u => u.id);
  
  // تعطيل المستخدمين الآخرين (بدلاً من الحذف)
  if (protectedIds.length > 0) {
    console.log("\n⏸️  جاري تعطيل المستخدمين الآخرين...");
    
    // تعطيل المستخدمين
    await db.update(users)
      .set({ status: 'suspended' })
      .where(not(inArray(users.id, protectedIds)));
    
    console.log("✅ تم تعطيل المستخدمين الآخرين");
  }
  
  console.log("\n👥 جاري إنشاء مستخدمين تجريبيين...");
  
  // إنشاء مستخدمين تجريبيين
  const testUsers = [
    {
      openId: "test_projects_office_001",
      name: "أحمد محمد - مكتب المشاريع",
      email: "projects@test.tamam.local",
      phone: "0501234567",
      role: "projects_office" as const,
      status: "active" as const,
    },
    {
      openId: "test_field_team_001",
      name: "خالد عبدالله - فريق ميداني",
      email: "field@test.tamam.local",
      phone: "0501234568",
      role: "field_team" as const,
      status: "active" as const,
    },
    {
      openId: "test_financial_001",
      name: "فاطمة أحمد - مالية",
      email: "financial@test.tamam.local",
      phone: "0501234569",
      role: "financial" as const,
      status: "active" as const,
    },
    {
      openId: "test_service_requester_001",
      name: "محمد سعيد - طالب خدمة",
      email: "requester@test.tamam.local",
      phone: "0501234570",
      role: "service_requester" as const,
      status: "active" as const,
    },
  ];
  
  for (const userData of testUsers) {
    await db.insert(users).values(userData);
    console.log(`✅ تم إنشاء: ${userData.name} (${userData.role})`);
  }
  
  console.log("\n🎉 تم إعداد المستخدمين التجريبيين بنجاح!");
  console.log("\n📋 ملخص المستخدمين:");
  
  const finalUsers = await db.select().from(users);
  finalUsers.forEach(u => {
    console.log(`  - ${u.name} (${u.email}) - ${u.role}`);
  });
  
  process.exit(0);
}

setupTestUsers().catch((error) => {
  console.error("❌ خطأ:", error);
  process.exit(1);
});
