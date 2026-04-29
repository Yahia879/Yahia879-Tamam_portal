import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// إضافة التصنيفات الجديدة
const newCategories = [
  { name: 'funding_sources', nameAr: 'مصادر الدعم', type: 'funding_sources', sortOrder: 1 },
  { name: 'project_owners', nameAr: 'الجهات المالكة للمشاريع', type: 'project_owners', sortOrder: 2 },
  { name: 'signatories', nameAr: 'أصحاب صلاحية التوقيع', type: 'signatories', sortOrder: 3 },
  { name: 'banks', nameAr: 'البنوك', type: 'banks', sortOrder: 4 },
];

for (const cat of newCategories) {
  // التحقق من عدم وجود التصنيف
  const [existing] = await conn.execute('SELECT id FROM categories WHERE type = ?', [cat.type]);
  if (existing.length === 0) {
    await conn.execute(
      'INSERT INTO categories (name, nameAr, type, sortOrder, isActive) VALUES (?, ?, ?, ?, true)',
      [cat.name, cat.nameAr, cat.type, cat.sortOrder]
    );
    console.log(`✅ تم إضافة تصنيف: ${cat.nameAr}`);
  } else {
    console.log(`⏭️ التصنيف موجود: ${cat.nameAr}`);
  }
}

// جلب IDs التصنيفات الجديدة
const [fundingSourceCat] = await conn.execute('SELECT id FROM categories WHERE type = ?', ['funding_sources']);
const [projectOwnersCat] = await conn.execute('SELECT id FROM categories WHERE type = ?', ['project_owners']);
const [signatoriesCat] = await conn.execute('SELECT id FROM categories WHERE type = ?', ['signatories']);
const [banksCat] = await conn.execute('SELECT id FROM categories WHERE type = ?', ['banks']);

// إضافة قيم مصادر الدعم
if (fundingSourceCat.length > 0) {
  const fundingSourceId = fundingSourceCat[0].id;
  const fundingSources = [
    { value: 'donation_store', valueAr: 'متجر التبرعات', sortOrder: 1 },
    { value: 'ehsan_platform', valueAr: 'منصة إحسان', sortOrder: 2 },
    { value: 'direct_donation', valueAr: 'تبرع مباشر', sortOrder: 3 },
    { value: 'granting_entity', valueAr: 'جهة مانحة', sortOrder: 4 },
    { value: 'individual_donor', valueAr: 'متبرع فرد', sortOrder: 5 },
    { value: 'assignment', valueAr: 'إسناد', sortOrder: 6 },
    { value: 'association_support', valueAr: 'دعم من الجمعية', sortOrder: 7 },
    { value: 'other', valueAr: 'أخرى', sortOrder: 8 },
  ];
  
  for (const src of fundingSources) {
    const [existing] = await conn.execute(
      'SELECT id FROM category_values WHERE categoryId = ? AND value = ?',
      [fundingSourceId, src.value]
    );
    if (existing.length === 0) {
      await conn.execute(
        'INSERT INTO category_values (categoryId, value, valueAr, sortOrder, isActive) VALUES (?, ?, ?, ?, true)',
        [fundingSourceId, src.value, src.valueAr, src.sortOrder]
      );
      console.log(`  ✅ تم إضافة مصدر دعم: ${src.valueAr}`);
    }
  }
}

// إضافة قيم الجهات المالكة للمشاريع
if (projectOwnersCat.length > 0) {
  const projectOwnersId = projectOwnersCat[0].id;
  const projectOwners = [
    { value: 'pmo', valueAr: 'مكتب إدارة المشاريع PMO', sortOrder: 1 },
    { value: 'corporate_comm', valueAr: 'الاتصال المؤسسي', sortOrder: 2 },
    { value: 'operations', valueAr: 'إدارة العمليات', sortOrder: 3 },
    { value: 'maintenance', valueAr: 'إدارة الصيانة', sortOrder: 4 },
    { value: 'development', valueAr: 'إدارة التطوير', sortOrder: 5 },
    { value: 'other', valueAr: 'أخرى', sortOrder: 6 },
  ];
  
  for (const owner of projectOwners) {
    const [existing] = await conn.execute(
      'SELECT id FROM category_values WHERE categoryId = ? AND value = ?',
      [projectOwnersId, owner.value]
    );
    if (existing.length === 0) {
      await conn.execute(
        'INSERT INTO category_values (categoryId, value, valueAr, sortOrder, isActive) VALUES (?, ?, ?, ?, true)',
        [projectOwnersId, owner.value, owner.valueAr, owner.sortOrder]
      );
      console.log(`  ✅ تم إضافة جهة مالكة: ${owner.valueAr}`);
    }
  }
}

// إضافة قيم أصحاب صلاحية التوقيع
if (signatoriesCat.length > 0) {
  const signatoriesId = signatoriesCat[0].id;
  const signatories = [
    { value: 'executive_director', valueAr: 'المدير التنفيذي', sortOrder: 1 },
    { value: 'financial_director', valueAr: 'المدير المالي', sortOrder: 2 },
    { value: 'accountant', valueAr: 'المحاسب', sortOrder: 3 },
    { value: 'project_manager', valueAr: 'مدير المشروع', sortOrder: 4 },
    { value: 'board_member', valueAr: 'عضو مجلس الإدارة', sortOrder: 5 },
    { value: 'chairman', valueAr: 'رئيس مجلس الإدارة', sortOrder: 6 },
  ];
  
  for (const sig of signatories) {
    const [existing] = await conn.execute(
      'SELECT id FROM category_values WHERE categoryId = ? AND value = ?',
      [signatoriesId, sig.value]
    );
    if (existing.length === 0) {
      await conn.execute(
        'INSERT INTO category_values (categoryId, value, valueAr, sortOrder, isActive) VALUES (?, ?, ?, ?, true)',
        [signatoriesId, sig.value, sig.valueAr, sig.sortOrder]
      );
      console.log(`  ✅ تم إضافة صاحب صلاحية: ${sig.valueAr}`);
    }
  }
}

// إضافة قيم البنوك
if (banksCat.length > 0) {
  const banksId = banksCat[0].id;
  const banks = [
    { value: 'alrajhi', valueAr: 'مصرف الراجحي', sortOrder: 1 },
    { value: 'alinma', valueAr: 'مصرف الإنماء', sortOrder: 2 },
    { value: 'albilad', valueAr: 'بنك البلاد', sortOrder: 3 },
    { value: 'aljazira', valueAr: 'بنك الجزيرة', sortOrder: 4 },
    { value: 'snb', valueAr: 'البنك الأهلي السعودي', sortOrder: 5 },
    { value: 'sab', valueAr: 'البنك السعودي البريطاني ساب', sortOrder: 6 },
    { value: 'riyad', valueAr: 'بنك الرياض', sortOrder: 7 },
    { value: 'anb', valueAr: 'البنك العربي الوطني', sortOrder: 8 },
    { value: 'samba', valueAr: 'مجموعة سامبا المالية', sortOrder: 9 },
    { value: 'other', valueAr: 'أخرى', sortOrder: 10 },
  ];
  
  for (const bank of banks) {
    const [existing] = await conn.execute(
      'SELECT id FROM category_values WHERE categoryId = ? AND value = ?',
      [banksId, bank.value]
    );
    if (existing.length === 0) {
      await conn.execute(
        'INSERT INTO category_values (categoryId, value, valueAr, sortOrder, isActive) VALUES (?, ?, ?, ?, true)',
        [banksId, bank.value, bank.valueAr, bank.sortOrder]
      );
      console.log(`  ✅ تم إضافة بنك: ${bank.valueAr}`);
    }
  }
}

console.log('\n✅ تم إضافة جميع التصنيفات الجديدة بنجاح!');

await conn.end();
