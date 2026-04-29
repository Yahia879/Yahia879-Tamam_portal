import mysql from 'mysql2/promise';
import crypto from 'crypto';

const DATABASE_URL = process.env.DATABASE_URL;

// Simple bcrypt alternative using crypto
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

async function createTestUsers() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  const testUsers = [
    {
      name: 'مدير المشاريع - تجريبي',
      email: 'project.manager@test.tamam.sa',
      password: 'Test@123456',
      phone: '0501234567',
      role: 'project_manager',
      status: 'active',
    },
    {
      name: 'فريق ميداني - تجريبي',
      email: 'field.team@test.tamam.sa',
      password: 'Test@123456',
      phone: '0501234568',
      role: 'field_team',
      status: 'active',
    },
    {
      name: 'مكتب المشاريع - تجريبي',
      email: 'projects.office@test.tamam.sa',
      password: 'Test@123456',
      phone: '0501234569',
      role: 'projects_office',
      status: 'active',
    },
    {
      name: 'الشؤون المالية - تجريبي',
      email: 'financial@test.tamam.sa',
      password: 'Test@123456',
      phone: '0501234570',
      role: 'financial',
      status: 'active',
    },
    {
      name: 'طالب خدمة - تجريبي',
      email: 'requester@test.tamam.sa',
      password: 'Test@123456',
      phone: '0501234571',
      role: 'service_requester',
      status: 'active',
    },
  ];
  
  console.log('إنشاء حسابات تجريبية...\n');
  
  for (const user of testUsers) {
    // Note: Using simple hash for demo. In production, use bcrypt from server/auth.ts
    const hashedPassword = hashPassword(user.password);
    
    try {
      await connection.query(
        'INSERT INTO users (name, email, password, phone, role, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, NOW())',
        [user.name, user.email, hashedPassword, user.phone, user.role, user.status]
      );
      console.log(`✅ تم إنشاء حساب: ${user.name} (${user.email})`);
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        console.log(`⚠️  الحساب موجود بالفعل: ${user.email}`);
      } else {
        console.error(`❌ خطأ في إنشاء ${user.email}:`, error.message);
      }
    }
  }
  
  console.log('\n✅ تم إنشاء جميع الحسابات التجريبية بنجاح!');
  console.log('\n📋 بيانات تسجيل الدخول:');
  console.log('كلمة المرور لجميع الحسابات: Test@123456\n');
  
  testUsers.forEach(user => {
    console.log(`${user.name}:`);
    console.log(`  البريد: ${user.email}`);
    console.log(`  الدور: ${user.role}\n`);
  });
  
  await connection.end();
}

createTestUsers();
